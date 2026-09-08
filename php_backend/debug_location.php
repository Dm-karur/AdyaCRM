<?php
/**
 * Location Debugging Script
 * Upload this to your Hostinger root and access via browser to diagnose location issues.
 * DELETE THIS FILE AFTER DEBUGGING!
 */

header('Content-Type: text/html; charset=utf-8');

// Load Database config
require_once __DIR__ . '/api/config/Database.php';

$database = new \App\config\Database();
$conn = $database->getConnection();

echo "<html><head><title>Location Debug</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:900px;margin:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4F46E5;color:white}.warn{background:#FEF3C7;padding:10px;border-radius:8px;margin:10px 0}.good{background:#D1FAE5;padding:10px;border-radius:8px;margin:10px 0}.bad{background:#FEE2E2;padding:10px;border-radius:8px;margin:10px 0}h2{color:#4F46E5}</style></head><body>";

echo "<h1>🔍 Attendance Location Debugger</h1>";

// === 1. Show all branches ===
echo "<h2>1. Branches in Database</h2>";
$stmt = $conn->query("SELECT * FROM branches ORDER BY id");
$branches = $stmt->fetchAll(\PDO::FETCH_ASSOC);
echo "<table><tr><th>ID</th><th>Name</th><th>Code</th><th>Latitude</th><th>Longitude</th><th>Radius (m)</th><th>Status</th></tr>";
foreach ($branches as $b) {
    $latClass = empty($b['latitude']) ? 'style="color:red;font-weight:bold"' : '';
    $lngClass = empty($b['longitude']) ? 'style="color:red;font-weight:bold"' : '';
    echo "<tr>";
    echo "<td>{$b['id']}</td>";
    echo "<td>{$b['name']}</td>";
    echo "<td>{$b['code']}</td>";
    echo "<td $latClass>" . ($b['latitude'] ?? 'NULL') . "</td>";
    echo "<td $lngClass>" . ($b['longitude'] ?? 'NULL') . "</td>";
    echo "<td>{$b['attendance_radius']}</td>";
    echo "<td>{$b['status']}</td>";
    echo "</tr>";
}
echo "</table>";

// === 2. Show all users and their branch assignment ===
echo "<h2>2. Users & Branch Assignments</h2>";
$stmt2 = $conn->query("SELECT id, name, employeeId, role, branch, allow_outside_radius FROM users ORDER BY id");
$users = $stmt2->fetchAll(\PDO::FETCH_ASSOC);
echo "<table><tr><th>ID</th><th>Name</th><th>EmployeeID</th><th>Role</th><th>Assigned Branch</th><th>Allow Outside?</th></tr>";
foreach ($users as $u) {
    echo "<tr>";
    echo "<td>{$u['id']}</td>";
    echo "<td>{$u['name']}</td>";
    echo "<td>{$u['employeeId']}</td>";
    echo "<td>{$u['role']}</td>";
    echo "<td>" . ($u['branch'] ?? 'NULL') . "</td>";
    echo "<td>" . ($u['allow_outside_radius'] ? 'Yes' : 'No') . "</td>";
    echo "</tr>";
}
echo "</table>";

// === 3. Test distance calculation ===
echo "<h2>3. Distance Calculator</h2>";

// Use user's location from screenshot: 10.957174, 78.065688
$testLat = isset($_GET['lat']) ? (float)$_GET['lat'] : 10.957174;
$testLng = isset($_GET['lng']) ? (float)$_GET['lng'] : 78.065688;

echo "<p>Your test location: <strong>Lat: $testLat, Lng: $testLng</strong></p>";
echo "<p style='font-size:12px;color:gray'>To test a different location, add ?lat=XX.XXXX&lng=YY.YYYY to the URL</p>";

foreach ($branches as $b) {
    if (!empty($b['latitude']) && !empty($b['longitude'])) {
        $distance = haversineDistance($testLat, $testLng, (float)$b['latitude'], (float)$b['longitude']);
        $radius = (int)($b['attendance_radius'] ?? 100);
        $isInside = $distance <= $radius;
        $class = $isInside ? 'good' : 'bad';
        $icon = $isInside ? '✅' : '❌';
        echo "<div class='$class'>";
        echo "<strong>$icon Branch: {$b['name']}</strong><br>";
        echo "Branch coords: Lat={$b['latitude']}, Lng={$b['longitude']}<br>";
        echo "Distance from you: <strong>" . round($distance, 2) . " meters</strong><br>";
        echo "Allowed radius: <strong>{$radius} meters</strong><br>";
        echo "Result: <strong>" . ($isInside ? 'WITHIN RADIUS ✅' : 'OUTSIDE RADIUS ❌') . "</strong>";
        echo "</div>";
    } else {
        echo "<div class='warn'>⚠️ Branch: {$b['name']} — <strong>Location NOT configured</strong> (Lat/Lng are NULL). This means coordinates were NOT extracted from the Google Maps link.</div>";
    }
}

// === 4. Test Google Maps link extraction ===
echo "<h2>4. Test Google Maps Link Extraction</h2>";
if (isset($_GET['maps_link'])) {
    $url = $_GET['maps_link'];
    echo "<p>Testing link: <code>$url</code></p>";
    
    // Resolve shortlink
    if (strpos($url, 'goo.gl') !== false || strpos($url, 'maps.app.goo.gl') !== false) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        echo "<p>HTTP Status: <strong>$httpCode</strong></p>";
        if ($curlError) echo "<div class='bad'>cURL Error: $curlError</div>";
        echo "<p>Resolved URL: <code>" . htmlspecialchars($finalUrl) . "</code></p>";
        $url = $finalUrl;
    }
    
    // Try regex patterns
    $patterns = [
        '@lat,lng' => '/@(-?\d+\.\d+),(-?\d+\.\d+)/',
        '?q=lat,lng' => '/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/',
        '!3d!4d' => '/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/',
    ];
    
    $found = false;
    foreach ($patterns as $name => $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            echo "<div class='good'>✅ Pattern '<strong>$name</strong>' matched!<br>Latitude: {$matches[1]}<br>Longitude: {$matches[2]}</div>";
            $found = true;
            break;
        }
    }
    if (!$found) {
        echo "<div class='bad'>❌ No pattern matched the resolved URL. The coordinates could not be extracted.</div>";
    }
} else {
    echo "<p>To test extraction, add <code>&maps_link=YOUR_LINK_HERE</code> to the URL.</p>";
}

echo "</body></html>";

function haversineDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371000;
    $latDelta = deg2rad($lat2 - $lat1);
    $lonDelta = deg2rad($lon2 - $lon1);
    $a = sin($latDelta / 2) * sin($latDelta / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($lonDelta / 2) * sin($lonDelta / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}
