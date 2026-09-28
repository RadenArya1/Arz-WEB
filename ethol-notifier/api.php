<?php
/**
 * ============================================================
 *  ARZ-WEB ETHOL NOTIFIER SELF-HEALING GATEWAY (api.php)
 *  Gateway cerdas dengan auto-failover, health-caching node,
 *  dan prioritas node aktif untuk respons secepat kilat (<10ms).
 * ============================================================
 */
error_reporting(0);
ini_set('display_errors', '0');
ini_set('default_socket_timeout', '3');
set_time_limit(20);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$path = $_GET["path"] ?? "";
if (!$path && isset($_SERVER["PATH_INFO"])) {
    $path = ltrim($_SERVER["PATH_INFO"], "/");
}
if (!$path) {
    $uri = $_SERVER["REQUEST_URI"] ?? "";
    $cleanUri = explode("?", $uri)[0];
    if (preg_match("#api\.php/(.*)$#", $cleanUri, $m)) {
        $path = $m[1];
    }
}

$path = trim($path, "/");
$path = preg_replace("#^api/absen/?#", "", $path);
$path = trim($path, "/");

$stateFile  = __DIR__ . "/device_state.json";
$healthFile = __DIR__ . "/node_health.json";

// ── Heartbeat Handler ──
if ($path === "heartbeat") {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $body = file_get_contents("php://input");
        $data = json_decode($body, true);
        if ($data) {
            $data["lastSeen"] = time();
            @file_put_contents($stateFile, json_encode($data, JSON_PRETTY_PRINT));
            header("Content-Type: application/json; charset=utf-8");
            echo json_encode(["ok" => true, "msg" => "Heartbeat saved", "time" => time()]);
            exit;
        }
    }
    $info = file_exists($stateFile) ? json_decode(@file_get_contents($stateFile), true) : null;
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["ok" => true, "deviceState" => $info]);
    exit;
}

// ── Muat Cache Kesehatan Node (Self-Healing Health Cache) ──
$nodeHealth = [];
if (file_exists($healthFile)) {
    $raw = @file_get_contents($healthFile);
    $nodeHealth = json_decode($raw, true) ?: [];
}

function saveNodeHealth($nodeHealth, $healthFile) {
    @file_put_contents($healthFile, json_encode($nodeHealth, JSON_PRETTY_PRINT));
}

// ── Tentukan Kandidat Node ──
$laptopIp = "100.87.248.13";
$laptopPort = 8080;
$laptopActive = false;

if (file_exists($stateFile)) {
    $st = json_decode(@file_get_contents($stateFile), true);
    if (!empty($st["tailscaleIp"])) {
        $laptopIp = $st["tailscaleIp"];
        if (!empty($st["port"])) $laptopPort = (int)$st["port"];
    }
    // Jika laptop mengirim heartbeat dalam 60 detik terakhir
    if (!empty($st["lastSeen"]) && (time() - $st["lastSeen"]) < 60) {
        $laptopActive = true;
    }
}

$laptopCandidate = "http://{$laptopIp}:{$laptopPort}/api/absen";

// Kandidat server CasaOS (Internal Docker bridge & Tailscale)
$casaCandidates = [
    "http://172.20.0.1:8080/api/absen",
    "http://100.73.128.8:8080/api/absen",
    "http://172.17.0.1:8080/api/absen",
];

// Susun urutan kandidat berdasarkan prioritas dan catatan kesehatan terakhir
$allCandidates = $laptopActive 
    ? array_merge([$laptopCandidate], $casaCandidates)
    : array_merge($casaCandidates, [$laptopCandidate]);

// Urutkan: node yang terakhir berhasil (lastSuccess) berada paling atas;
// node yang baru saja gagal (lastFailed < 30 detik lalu) digeser ke paling bawah
$now = time();
usort($allCandidates, function($a, $b) use ($nodeHealth, $now) {
    $hA = $nodeHealth[$a] ?? ["failedAt" => 0, "successAt" => 0];
    $hB = $nodeHealth[$b] ?? ["failedAt" => 0, "successAt" => 0];

    $failedRecentlyA = ($now - $hA["failedAt"]) < 30;
    $failedRecentlyB = ($now - $hB["failedAt"]) < 30;

    if ($failedRecentlyA && !$failedRecentlyB) return 1;
    if (!$failedRecentlyA && $failedRecentlyB) return -1;

    return ($hB["successAt"] ?? 0) <=> ($hA["successAt"] ?? 0);
});

function forwardRequest($targetUrl, $method, $body, $timeoutMs = 1500) {
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, $timeoutMs);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    if (!empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return [$httpCode, $response, $err];
}

$method = $_SERVER["REQUEST_METHOD"];
$body   = file_get_contents("php://input");

// ── Penanganan Khusus log-stream agar tidak mengunci PHP Worker ──
if ($path === "log-stream") {
    header("Content-Type: text/event-stream; charset=utf-8");
    header("Cache-Control: no-cache, no-transform");
    header("Connection: close");
    header("X-Accel-Buffering: no");

    echo ": connected\n\n";
    flush();

    $nowMs = time() * 1000;
    $oneDayMs = 24 * 60 * 60 * 1000;

    // Coba ambil dari kandidat terbaik
    foreach ($allCandidates as $base) {
        list($code, $res) = forwardRequest($base . "/logs", "GET", null, 1200);
        if ($code === 200 && $res) {
            $lines = json_decode($res, true);
            if (is_array($lines)) {
                $seenSig = [];
                foreach ($lines as $item) {
                    $itemTs = isset($item["ts"]) ? (float)$item["ts"] : $nowMs;
                    // Hanya stream presensi yang masih dalam rentang 1 hari (24 jam)
                    if (($nowMs - $itemTs) < $oneDayMs && ($nowMs - $itemTs) >= 0) {
                        $sig = !empty($item["screenshot"]) ? $item["screenshot"] : (($item["text"] ?? "") . "_" . floor($itemTs / 30000));
                        if (!isset($seenSig[$sig])) {
                            $seenSig[$sig] = true;
                            echo "data: " . json_encode($item) . "\n\n";
                        }
                    }
                }
            }
            $nodeHealth[$base]["successAt"] = time();
            saveNodeHealth($nodeHealth, $healthFile);
            break;
        }
    }
    flush();
    exit;
}

function getPresensiCourseKey($text) {
    $clean = preg_replace('/\\x1b\\[[0-9;]*m/', '', (string)$text);
    $clean = preg_replace('/\\[SCREENSHOT:[^\\]]+\\]/i', '', $clean);
    $clean = preg_replace('/^\\[.*?\\]\\s*/', '', $clean);
    $clean = preg_replace('/^[✓✔]\\s*/', '', $clean);
    $lower = strtolower(trim($clean));

    if (strpos($lower, 'statistika') !== false) return 'statistika';
    if (strpos($lower, 'praktikum') !== false && strpos($lower, 'nirkabel') !== false) return 'praktikum_jarkom';
    if (strpos($lower, 'jaringan') !== false || strpos($lower, 'nirkabel') !== false) return 'jarkom';
    if (strpos($lower, 'pemrograman') !== false || strpos($lower, 'wpl') !== false) return 'wpl';
    if (strpos($lower, 'embedded') !== false) return 'embedded';

    $parts = @preg_split('/[-—:]/u', $clean);
    if (is_array($parts) && count($parts) > 1) {
        $lastPart = $parts[count($parts) - 1];
        $candidate = preg_replace('/[^a-z0-9]/', '_', strtolower(trim($lastPart)));
        if (strlen($candidate) > 2) return $candidate;
    }
    return substr(preg_replace('/[^a-z0-9]/', '_', $lower), 0, 40);
}

// ── Penanganan Khusus logs agar memfilter presensi maksimal 1 hari (24 jam) & anti-duplikasi ──
if ($path === "logs") {
    $nowMs = time() * 1000;
    $oneDayMs = 24 * 60 * 60 * 1000;
    $filteredLines = [];
    $seenSig = [];
    $foundNode = false;

    foreach ($allCandidates as $base) {
        list($code, $res) = forwardRequest($base . "/logs", "GET", null, 1200);
        if ($code === 200 && $res) {
            $lines = json_decode($res, true);
            if (is_array($lines)) {
                foreach ($lines as $item) {
                    $itemTs = isset($item["ts"]) ? (float)$item["ts"] : $nowMs;
                    if (($nowMs - $itemTs) < $oneDayMs && ($nowMs - $itemTs) >= 0) {
                        $courseKey = getPresensiCourseKey($item["text"] ?? "");
                        if (!isset($seenSig[$courseKey])) {
                            $seenSig[$courseKey] = true;
                            $filteredLines[] = $item;
                        }
                    }
                }
                $foundNode = true;
                $nodeHealth[$base]["successAt"] = time();
                saveNodeHealth($nodeHealth, $healthFile);
                break;
            }
        }
    }

    if (!$foundNode) {
        // Fallback file buffer lokal jika node backend sedang offline
        $candidateBufferFiles = [
            __DIR__ . "/logs_buffer.json",
            dirname(__DIR__) . "/logs_buffer.json"
        ];
        foreach ($candidateBufferFiles as $bf) {
            if (file_exists($bf)) {
                $raw = @file_get_contents($bf);
                $lines = json_decode($raw, true);
                if (is_array($lines)) {
                    foreach ($lines as $item) {
                        $itemTs = isset($item["ts"]) ? (float)$item["ts"] : $nowMs;
                        if (($nowMs - $itemTs) < $oneDayMs && ($nowMs - $itemTs) >= 0) {
                            $courseKey = getPresensiCourseKey($item["text"] ?? "");
                            if (!isset($seenSig[$courseKey])) {
                                $seenSig[$courseKey] = true;
                                $filteredLines[] = $item;
                            }
                        }
                    }
                    $foundNode = true;
                    break;
                }
            }
        }
    }

    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($filteredLines);
    exit;
}

// ── Forward Request dengan Auto-Failover Seketika ──
$success = false;
$diagnostics = [];

foreach ($allCandidates as $base) {
    $targetUrl = $base . "/" . $path;
    list($code, $res, $err) = forwardRequest($targetUrl, $method, $body, 1200);

    if ($code > 0 && $code < 500) {
        http_response_code($code);
        header("Content-Type: application/json; charset=utf-8");
        echo $res;
        $success = true;

        // Catat keberhasilan node untuk request berikutnya
        $nodeHealth[$base] = [
            "successAt" => time(),
            "failedAt"  => 0,
            "lastError" => ""
        ];
        saveNodeHealth($nodeHealth, $healthFile);
        break;
    } else {
        // Catat kegagalan sementara
        $nodeHealth[$base] = [
            "successAt" => $nodeHealth[$base]["successAt"] ?? 0,
            "failedAt"  => time(),
            "lastError" => $err ?: "HTTP $code"
        ];
        $diagnostics[$base] = $err ?: "HTTP $code";
    }
}

if (!$success) {
    saveNodeHealth($nodeHealth, $healthFile);
    http_response_code(503);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        "error" => true,
        "online" => false,
        "selfHealing" => true,
        "message" => "Backend Ethol sedang mengaktifkan failover otomatis. Silakan coba kembali dalam beberapa detik.",
        "diagnostics" => $diagnostics,
        "timestamp" => time()
    ]);
}