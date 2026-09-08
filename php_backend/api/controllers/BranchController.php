<?php
namespace App\controllers;

use App\config\Database;
use App\models\Branch;
use App\middleware\AuthMiddleware;

class BranchController {
    private $db;
    private $branch;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->branch = new Branch($this->db);
        
        $this->user = AuthMiddleware::protect();
    }

    private function extractCoordinatesFromMapsLink($url) {
        if (empty($url)) return ['latitude' => null, 'longitude' => null];

        // 1. Resolve shortlink if needed
        if (strpos($url, 'goo.gl') !== false || strpos($url, 'maps.app.goo.gl') !== false) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow all redirects to get final URL
            curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_exec($ch);
            
            $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
            if (!empty($finalUrl)) {
                $url = $finalUrl;
            }
            curl_close($ch);
        }

        // 2. Extract using regex
        // Format 1: @lat,lng
        if (preg_match('/@(-?\d+\.\d+),(-?\d+\.\d+)/', $url, $matches)) {
            return [
                'latitude' => (float)$matches[1],
                'longitude' => (float)$matches[2]
            ];
        }

        // Format 2: ?q=lat,lng
        if (preg_match('/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/', $url, $matches)) {
            return [
                'latitude' => (float)$matches[1],
                'longitude' => (float)$matches[2]
            ];
        }

        // Format 3: !3dlat!4dlng (often used in places URLs)
        if (preg_match('/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/', $url, $matches)) {
            return [
                'latitude' => (float)$matches[1],
                'longitude' => (float)$matches[2]
            ];
        }

        if (preg_match('/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/', $url, $matches)) {
            return [
                'latitude' => (float)$matches[1],
                'longitude' => (float)$matches[2]
            ];
        }

        // Fallback or unparseable
        return ['latitude' => null, 'longitude' => null];
    }

    /**
     * @desc    Get all branches
     * @route   GET /api/branches
     * @access  Private
     */
    public function getBranches() {
        try {
            $branches = $this->branch->getAll();
            echo json_encode($branches);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * @desc    Create a new branch
     * @route   POST /api/branches
     * @access  Private/Admin
     */
    public function createBranch() {
        // Enforce admin only
        if (!isset($this->user['role']) || $this->user['role'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Access denied, admin only"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(["message" => "Branch name is required"]);
            return;
        }

        try {
            // Generate a unique automated branch code
            $code = $this->branch->generateUniqueCode();

            $latitude = isset($data['latitude']) ? $data['latitude'] : null;
            $longitude = isset($data['longitude']) ? $data['longitude'] : null;

            if (!empty($data['google_maps_link'])) {
                $coords = $this->extractCoordinatesFromMapsLink($data['google_maps_link']);
                if ($coords['latitude'] !== null && $coords['longitude'] !== null) {
                    $latitude = $coords['latitude'];
                    $longitude = $coords['longitude'];
                }
            }

            $attendance_radius = isset($data['attendance_radius']) ? (int)$data['attendance_radius'] : 100;
            $status = isset($data['status']) ? $data['status'] : 'Active';

            $newBranch = $this->branch->create($data['name'], $code, $latitude, $longitude, $attendance_radius, $status);
            
            if ($newBranch) {
                http_response_code(201);
                echo json_encode($newBranch);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to create branch"]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * @desc    Update an existing branch
     * @route   PUT /api/branches/:id
     * @access  Private/Admin
     */
    public function updateBranch($id) {
        // Enforce admin only
        if (!isset($this->user['role']) || $this->user['role'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Access denied, admin only"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(["message" => "Branch name is required"]);
            return;
        }

        try {
            $latitude = isset($data['latitude']) ? $data['latitude'] : null;
            $longitude = isset($data['longitude']) ? $data['longitude'] : null;

            if (!empty($data['google_maps_link'])) {
                $coords = $this->extractCoordinatesFromMapsLink($data['google_maps_link']);
                if ($coords['latitude'] !== null && $coords['longitude'] !== null) {
                    $latitude = $coords['latitude'];
                    $longitude = $coords['longitude'];
                }
            }

            $attendance_radius = isset($data['attendance_radius']) ? (int)$data['attendance_radius'] : 100;
            $status = isset($data['status']) ? $data['status'] : 'Active';

            $success = $this->branch->update($id, $data['name'], $latitude, $longitude, $attendance_radius, $status);
            
            if ($success) {
                http_response_code(200);
                echo json_encode(["message" => "Branch updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to update branch"]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    }
}
