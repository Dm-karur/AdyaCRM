<?php
namespace App\controllers;

use App\config\Database;
use App\models\Attendance;
use App\middleware\AuthMiddleware;

// Load config for upload dir and geocode settings
require_once __DIR__ . '/../config/config.php';

class AttendanceController {
    private $db;
    private $attendance;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->attendance = new Attendance($this->db);
        $this->user = AuthMiddleware::protect();
    }

    private function generateId() {
        return bin2hex(random_bytes(12)); // 24 chars hex
    }

    private function saveBase64Image($base64String, $employeeId, $type) {
        if (!$base64String || strpos($base64String, 'data:image') !== 0) return $base64String;
        
        try {
            $matches = [];
            preg_match('/^data:([A-Za-z-+\/]+);base64,(.+)$/', $base64String, $matches);
            if (count($matches) !== 3) return $base64String;
            
            $imageBuffer = base64_decode($matches[2]);
            $fileName = $employeeId . '_' . $type . '_' . time() . '_' . mt_rand(1000, 9999) . '.jpg';
            
            $uploadsDir = defined('UPLOAD_DIR') ? UPLOAD_DIR : __DIR__ . '/../../uploads';
            if (!file_exists($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
            }
            
            $filePath = $uploadsDir . '/' . $fileName;
            file_put_contents($filePath, $imageBuffer);
            
            return '/uploads/' . $fileName;
        } catch (\Exception $error) {
            error_log('Error saving image: ' . $error->getMessage());
            return $base64String;
        }
    }

    /**
     * Reverse geocode GPS coordinates to readable address using OpenStreetMap Nominatim.
     * Matches Node.js reverseGeocode.js utility.
     */
    private function reverseGeocode($latitude, $longitude) {
        if (!$latitude || !$longitude) return 'Address Not Available';

        try {
            $url = "https://nominatim.openstreetmap.org/reverse?lat={$latitude}&lon={$longitude}&format=json&addressdetails=1";
            
            $context = stream_context_create([
                'http' => [
                    'header' => "User-Agent: " . (defined('GEOCODE_USER_AGENT') ? GEOCODE_USER_AGENT : 'AttendanceSystem/1.0') . "\r\n" .
                                "Accept-Language: en\r\n",
                    'timeout' => 5
                ]
            ]);

            $response = @file_get_contents($url, false, $context);
            if ($response === false) return 'Address Not Available';

            $data = json_decode($response, true);
            if (!$data || isset($data['error'])) return 'Address Not Available';

            $addr = $data['address'] ?? [];
            $parts = [];

            if (isset($addr['village'])) $parts[] = $addr['village'];
            elseif (isset($addr['town'])) $parts[] = $addr['town'];
            elseif (isset($addr['city'])) $parts[] = $addr['city'];
            elseif (isset($addr['suburb'])) $parts[] = $addr['suburb'];

            if (isset($addr['county'])) $parts[] = $addr['county'];
            elseif (isset($addr['state_district'])) $parts[] = $addr['state_district'];

            if (isset($addr['state'])) $parts[] = $addr['state'];
            if (isset($addr['country'])) $parts[] = $addr['country'];

            if (empty($parts)) {
                return $data['display_name'] ?? 'Address Not Available';
            }

            return implode(', ', $parts);
        } catch (\Exception $error) {
            error_log('Reverse geocoding failed: ' . $error->getMessage());
            return 'Address Not Available';
        }
    }

    /**
     * Calculate Haversine distance in meters
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2) {
        if (empty($lat1) || empty($lon1) || empty($lat2) || empty($lon2)) {
            return null;
        }

        $earthRadius = 6371000; // in meters
        
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        
        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);
             
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earthRadius * $c;
    }

    /**
     * Validate location against branch settings
     */
    private function validateLocation($latitude, $longitude) {
        $validation = [
            'status' => 'NOT_VALIDATED',
            'distance' => null,
            'isAllowed' => true,
            'error' => null,
            'debug' => []
        ];

        // If employee is allowed outside radius, no further checks needed
        if (isset($this->user['allow_outside_radius']) && $this->user['allow_outside_radius']) {
            $validation['status'] = 'OUTSIDE_RADIUS_ALLOWED';
            return $validation;
        }

        // Fetch assigned branch details
        $branchModel = new \App\models\Branch($this->db);
        $branchName = $this->user['branch'] ?? 'Main';
        $branch = $branchModel->getByName($branchName);

        $validation['debug']['user_branch'] = $branchName;
        $validation['debug']['user_lat'] = $latitude;
        $validation['debug']['user_lng'] = $longitude;

        if (!$branch) {
            $validation['error'] = "No branch found with name '{$branchName}'. Please contact Admin.";
            $validation['isAllowed'] = false;
            return $validation;
        }

        $validation['debug']['branch_name'] = $branch['name'];
        $validation['debug']['branch_lat'] = $branch['latitude'];
        $validation['debug']['branch_lng'] = $branch['longitude'];
        $validation['debug']['branch_radius'] = $branch['attendance_radius'] ?? 100;

        if (empty($branch['latitude']) || empty($branch['longitude'])) {
            // Branch location not configured, skip validation to be backward compatible
            $validation['status'] = 'BRANCH_NOT_CONFIGURED';
            return $validation;
        }

        if (empty($latitude) || empty($longitude)) {
            $validation['error'] = "Unable to determine your current location. Please allow location access to mark attendance.";
            $validation['isAllowed'] = false;
            return $validation;
        }

        $distance = $this->calculateDistance($latitude, $longitude, $branch['latitude'], $branch['longitude']);
        $radius = isset($branch['attendance_radius']) ? (int)$branch['attendance_radius'] : 100;

        $validation['distance'] = $distance;
        $validation['debug']['calculated_distance_meters'] = round($distance, 2);

        if ($distance <= $radius) {
            $validation['status'] = 'WITHIN_RADIUS';
            return $validation;
        } else {
            $validation['status'] = 'OUTSIDE_RADIUS';
            $validation['isAllowed'] = false;
            $validation['error'] = "You are outside the allowed attendance area. Distance: " . round($distance, 0) . "m, Allowed: {$radius}m. Branch: {$branch['name']} (Lat:{$branch['latitude']}, Lng:{$branch['longitude']})";
            return $validation;
        }
    }

    /**
     * @desc    Punch In
     * @route   POST /api/attendance/punch-in
     * @access  Private
     */
    public function punchIn() {
        $data = json_decode(file_get_contents("php://input"));
        
        $isOffline = isset($data->isOfflineRecorded) ? $data->isOfflineRecorded : false;
        $punchTime = $isOffline && isset($data->offlineTimestamp) 
            ? date('Y-m-d H:i:s', strtotime($data->offlineTimestamp)) 
            : date('Y-m-d H:i:s');
        $date = date('Y-m-d', strtotime($punchTime));

        $existing = $this->attendance->findTodayByEmployee($this->user['id'], $date);
        
        if ($existing && !empty($existing['punchIn_time'])) {
            http_response_code(400);
            echo json_encode(["message" => "Already punched in for today"]);
            return;
        }

        // Extract GPS coordinates
        $latitude = isset($data->location->latitude) ? $data->location->latitude : null;
        $longitude = isset($data->location->longitude) ? $data->location->longitude : null;
        
        // --- LOCATION VALIDATION ---
        $validation = $this->validateLocation($latitude, $longitude);
        if (!$validation['isAllowed']) {
            http_response_code(403);
            echo json_encode(["message" => $validation['error'], "debug" => $validation['debug'] ?? []]);
            return;
        }

        // Only save images to storage if location validation passes
        $photo = isset($data->photo) ? $data->photo : '';
        $originalSelfie = isset($data->originalSelfie) ? $data->originalSelfie : '';

        $finalStampedUrl = $this->saveBase64Image($photo, $this->user['employeeId'], 'stamped_in');
        $finalOriginalUrl = $this->saveBase64Image($originalSelfie, $this->user['employeeId'], 'original_in');

        // Reverse geocode
        $address = $this->reverseGeocode($latitude, $longitude);

        $insertData = [
            'id' => $existing ? $existing['id'] : $this->generateId(),
            'employeeId' => $this->user['id'],
            'employeeName' => $this->user['name'],
            'department' => $this->user['department'],
            'date' => $date,
            'punchIn_time' => $punchTime,
            'punchIn_photo' => $finalStampedUrl,
            'punchIn_originalSelfie' => $finalOriginalUrl,
            'punchIn_attendanceImage' => $finalStampedUrl,
            'punchIn_latitude' => $latitude,
            'punchIn_longitude' => $longitude,
            'punchIn_accuracy' => isset($data->location->accuracy) ? $data->location->accuracy : null,
            'punchIn_mapUrl' => isset($data->location->mapUrl) ? $data->location->mapUrl : null,
            'punchIn_address' => $address,
            'punchIn_browser' => isset($data->device->browser) ? $data->device->browser : null,
            'punchIn_os' => isset($data->device->os) ? $data->device->os : null,
            'punchIn_ip' => isset($data->device->ip) ? $data->device->ip : null,
            'status' => 'Present',
            'isOfflineRecorded' => $isOffline ? 1 : 0,
            'location_validation_status' => $validation['status'],
            'attendance_distance' => $validation['distance']
        ];

        if ($existing) {
            // Update the existing record
            unset($insertData['id']);
            unset($insertData['employeeId']);
            unset($insertData['date']);
            if ($this->attendance->updateFields($existing['id'], $insertData)) {
                $record = $this->attendance->getById($existing['id']);
                http_response_code(201);
                echo json_encode(Attendance::formatForFrontend($record));
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to punch in"]);
            }
        } else {
            if ($this->attendance->create($insertData)) {
                $record = $this->attendance->getById($insertData['id']);
                http_response_code(201);
                echo json_encode(Attendance::formatForFrontend($record));
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to punch in"]);
            }
        }
    }

    /**
     * @desc    Punch Out
     * @route   POST /api/attendance/punch-out
     * @access  Private
     */
    public function punchOut() {
        $data = json_decode(file_get_contents("php://input"));
        
        $isOffline = isset($data->isOfflineRecorded) ? $data->isOfflineRecorded : false;
        $punchTime = $isOffline && isset($data->offlineTimestamp) 
            ? date('Y-m-d H:i:s', strtotime($data->offlineTimestamp)) 
            : date('Y-m-d H:i:s');
        $date = date('Y-m-d', strtotime($punchTime));

        $existing = $this->attendance->findTodayByEmployee($this->user['id'], $date);
        
        if (!$existing || empty($existing['punchIn_time'])) {
            http_response_code(400);
            echo json_encode(["message" => "No punch-in record found for today"]);
            return;
        }
        if (!empty($existing['punchOut_time'])) {
            http_response_code(400);
            echo json_encode(["message" => "Already punched out for today"]);
            return;
        }

        // Extract GPS coordinates
        $latitude = isset($data->location->latitude) ? $data->location->latitude : null;
        $longitude = isset($data->location->longitude) ? $data->location->longitude : null;
        
        // --- LOCATION VALIDATION ---
        $validation = $this->validateLocation($latitude, $longitude);
        if (!$validation['isAllowed']) {
            http_response_code(403);
            echo json_encode(["message" => $validation['error'], "debug" => $validation['debug'] ?? []]);
            return;
        }

        // Only save images to storage if location validation passes
        $photo = isset($data->photo) ? $data->photo : '';
        $originalSelfie = isset($data->originalSelfie) ? $data->originalSelfie : '';

        $finalStampedUrl = $this->saveBase64Image($photo, $this->user['employeeId'], 'stamped_out');
        $finalOriginalUrl = $this->saveBase64Image($originalSelfie, $this->user['employeeId'], 'original_out');

        // Reverse geocode
        $address = $this->reverseGeocode($latitude, $longitude);

        // Calculations (matches Node.js logic)
        $punchInTs = strtotime($existing['punchIn_time']);
        $punchOutTs = strtotime($punchTime);
        $diffInSeconds = $punchOutTs - $punchInTs;
        $diffInMinutes = (int)floor($diffInSeconds / 60);

        $shiftStartHour = 9;
        $shiftEndHour = 18;
        $expectedWorkingMinutes = ($shiftEndHour - $shiftStartHour) * 60;
        
        $punchInHour = (int)date('H', $punchInTs);
        $punchInMin = (int)date('i', $punchInTs);
        
        $lateMinutes = 0;
        if ($punchInHour >= $shiftStartHour && $punchInMin > 0) {
            $lateMinutes = ($punchInHour - $shiftStartHour) * 60 + $punchInMin;
        } elseif ($punchInHour > $shiftStartHour) {
            $lateMinutes = ($punchInHour - $shiftStartHour) * 60 + $punchInMin;
        }

        $overtimeMinutes = 0;
        if ($diffInMinutes > $expectedWorkingMinutes) {
            $overtimeMinutes = $diffInMinutes - $expectedWorkingMinutes;
        }

        $updateData = [
            'punchOut_time' => $punchTime,
            'punchOut_photo' => $finalStampedUrl,
            'punchOut_originalSelfie' => $finalOriginalUrl,
            'punchOut_attendanceImage' => $finalStampedUrl,
            'punchOut_latitude' => $latitude,
            'punchOut_longitude' => $longitude,
            'punchOut_accuracy' => isset($data->location->accuracy) ? $data->location->accuracy : null,
            'punchOut_mapUrl' => isset($data->location->mapUrl) ? $data->location->mapUrl : null,
            'punchOut_address' => $address,
            'punchOut_browser' => isset($data->device->browser) ? $data->device->browser : null,
            'punchOut_os' => isset($data->device->os) ? $data->device->os : null,
            'punchOut_ip' => isset($data->device->ip) ? $data->device->ip : null,
            'workingHours' => $diffInMinutes,
            'lateMinutes' => max(0, $lateMinutes),
            'overtimeMinutes' => $overtimeMinutes,
            'location_validation_status' => $validation['status'],
            'attendance_distance' => $validation['distance']
        ];

        if ($this->attendance->updatePunchOut($existing['id'], $updateData)) {
            // CRITICAL FIX: Return full attendance record (not just message)
            $record = $this->attendance->getById($existing['id']);
            http_response_code(200);
            echo json_encode(Attendance::formatForFrontend($record));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to punch out"]);
        }
    }

    /**
     * @desc    Get employee's attendance history
     * @route   GET /api/attendance/me
     * @access  Private
     */
    public function getMyAttendance() {
        $records = $this->attendance->getMyAttendance($this->user['id']);
        
        // CRITICAL FIX: Format all records with complete nested structure
        $formattedRecords = array_map(function($record) {
            return Attendance::formatForFrontend($record);
        }, $records);

        http_response_code(200);
        echo json_encode($formattedRecords);
    }
}
