<?php
namespace App\controllers;

use App\config\Database;
use App\models\User;
use App\middleware\AuthMiddleware;

class AuthController {
    private $db;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
    }

    /**
     * @desc    Auth user & get token
     * @route   POST /api/auth/login
     * @access  Public
     */
    public function login() {
        $data = json_decode(file_get_contents("php://input"));
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        
        $rateLimiter = new \App\middleware\RateLimiter();
        if (!$rateLimiter->checkRateLimit($ip)) {
            http_response_code(429);
            echo json_encode(["message" => "Too many failed login attempts. Please try again in 15 minutes."]);
            return;
        }
        
        if (empty($data->employeeId) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Please provide employeeId and password"]);
            return;
        }

        $userData = $this->user->findByEmployeeId($data->employeeId);

        if (!$userData) {
            http_response_code(401);
            echo json_encode(["message" => "Invalid employee ID or password"]);
            return;
        }

        // CRITICAL FIX: Check isActive before allowing login (matches Node.js)
        if (!$userData['isActive']) {
            $rateLimiter->recordFailedAttempt($ip);
            http_response_code(401);
            echo json_encode(["message" => "Invalid employee ID or password"]);
            return;
        }

        if ($this->user->matchPassword($data->password, $userData['password'])) {
            $rateLimiter->clearAttempts($ip);
            $token = AuthMiddleware::generateToken($userData['id']);
            
            // Set Secure HttpOnly Cookie (Made more robust for varying server environments)
            setcookie("auth_token", $token, [
                'expires' => time() + (86400 * 30), // 30 days
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'None' // Changed to None to prevent cross-origin issues if they use www or drop https
            ]);
            
            http_response_code(200);
            echo json_encode([
                "_id" => $userData['id'],
                "name" => $userData['name'],
                "employeeId" => $userData['employeeId'],
                "role" => $userData['role'],
                "salaryType" => $userData['salaryType'] ?? null,
                "brand" => $userData['brand'] ?? null,
                "branch" => $userData['branch'] ?? null,
                // "token" => $token // Removed from body for security
            ]);
        } else {
            $rateLimiter->recordFailedAttempt($ip);
            http_response_code(401);
            echo json_encode(["message" => "Invalid employee ID or password"]);
        }
    }

    /**
     * @desc    Get user profile
     * @route   GET /api/auth/profile
     * @access  Private
     */
    public function getProfile() {
        $authUser = AuthMiddleware::protect();
        
        // authUser already has all fields from DB (AuthMiddleware::protect fetches full record)
        http_response_code(200);
        echo json_encode([
            "_id" => $authUser['_id'] ?? $authUser['id'],
            "name" => $authUser['name'],
            "employeeId" => $authUser['employeeId'],
            "role" => $authUser['role'],
            "department" => $authUser['department'],
            "shift" => $authUser['shift'],
            "photo" => $authUser['photo'],
            "isFieldWorker" => (bool)($authUser['isFieldWorker'] ?? false),
            "salaryType" => $authUser['salaryType'],
            "brand" => $authUser['brand'],
            "branch" => $authUser['branch'] ?? null
        ]);
    }

    /**
     * @desc    Register a new admin
     * @route   POST /api/auth/register-admin
     * @access  Public
     * 
     * This was MISSING from the PHP backend but exists in Node.js.
     */
    public function registerAdmin() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name) || empty($data->employeeId) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Please provide name, employeeId, and password"]);
            return;
        }

        $userExists = $this->user->findByEmployeeId($data->employeeId);
        if ($userExists) {
            http_response_code(400);
            echo json_encode(["message" => "User already exists"]);
            return;
        }

        $id = bin2hex(random_bytes(12));

        $insertData = [
            'id' => $id,
            'name' => $data->name,
            'employeeId' => $data->employeeId,
            'password' => $data->password,
            'role' => 'Admin',
            'department' => 'Management',
            'shift' => 'General',
            'isFieldWorker' => false,
            'salary' => 0,
            'salaryType' => 'Monthly',
            'shiftStart' => '09:00',
            'shiftEnd' => '18:00',
            'brand' => 'None',
            'branch' => 'Main'
        ];

        if ($this->user->create($insertData)) {
            $token = AuthMiddleware::generateToken($id);
            
            // Set Secure HttpOnly Cookie
            setcookie("auth_token", $token, [
                'expires' => time() + (86400 * 30), // 30 days
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'None'
            ]);
            
            http_response_code(201);
            echo json_encode([
                "_id" => $id,
                "name" => $insertData['name'],
                "employeeId" => $insertData['employeeId'],
                "role" => "Admin"
            ]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Invalid admin data"]);
        }
    }

    /**
     * @desc    Logout user & clear cookie
     * @route   POST /api/auth/logout
     * @access  Public
     */
    public function logout() {
        setcookie("auth_token", "", [
            'expires' => time() - 3600, // Expire immediately
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None'
        ]);
        
        http_response_code(200);
        echo json_encode(["message" => "Logged out successfully"]);
    }
}
