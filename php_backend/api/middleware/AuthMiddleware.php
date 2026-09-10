<?php
namespace App\middleware;

use App\config\Database;
use App\models\User;

// Load config for JWT_SECRET
require_once __DIR__ . '/../config/config.php';

class AuthMiddleware {
    private static $secret_key = null;

    private static function getSecret() {
        if (self::$secret_key === null) {
            self::$secret_key = defined('JWT_SECRET') ? JWT_SECRET : 'supersecurejwtsecret';
        }
        return self::$secret_key;
    }

    /**
     * Protect route - verifies JWT token and returns FULL user record from DB.
     * Matches Node.js behavior: req.user = await User.findById(decoded.id).select('-password')
     * 
     * @return array Full user associative array with all fields
     */
    public static function protect() {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(
                array_map('ucwords', array_keys($requestHeaders)),
                array_values($requestHeaders)
            );
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        
        $token = null;

        // Try getting token from cookie first (Secure HttpOnly session)
        if (isset($_COOKIE['auth_token'])) {
            $token = $_COOKIE['auth_token'];
        } 
        // Fallback to Authorization header
        else if ($headers && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            $token = $matches[1];
        }

        if ($token) {
            try {
                $decoded = self::decodeJWT($token);
                if (!$decoded) {
                    throw new \Exception("Invalid token format or signature");
                }
                if ($decoded->exp < time()) {
                    throw new \Exception("Token has expired");
                }

                // CRITICAL FIX: Fetch full user record from DB (matches Node.js protect middleware)
                $database = new Database();
                $db = $database->getConnection();
                $userModel = new User($db);
                $userData = $userModel->findById($decoded->id);

                if (!$userData) {
                    http_response_code(401);
                    echo json_encode(["message" => "Not authorized, user not found"]);
                    exit();
                }

                // CRITICAL FIX: Check isActive (matches Node.js: if (!req.user || !req.user.isActive))
                if (!$userData['isActive']) {
                    http_response_code(401);
                    echo json_encode(["message" => "Not authorized, user disabled or not found"]);
                    exit();
                }

                // Remove password from returned data
                unset($userData['password']);
                unset($userData['plainPassword']);

                // Normalize: ensure 'id' key exists and map _id
                if (isset($userData['_id'])) {
                    $userData['id'] = $userData['_id'];
                }

                return $userData;

            } catch (\Exception $e) {
                http_response_code(401);
                echo json_encode([
                    "message" => "Not authorized, token failed.",
                    "error" => $e->getMessage()
                ]);
                exit();
            }
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Not authorized, no token"]);
            exit();
        }
    }
    
    /**
     * Admin middleware - matches Node.js logic exactly:
     * Allows Admin role OR Employee with salaryType === 'Monthly'
     * 
     * Node.js: if (req.user.role === 'Admin' || (req.user.role === 'Employee' && req.user.salaryType === 'Monthly'))
     * 
     * @param array|null $user If null, calls protect() first
     * @return array The user data
     */
    public static function admin($user = null) {
        if ($user === null) {
            $user = self::protect();
        }

        // CRITICAL FIX: Match Node.js admin middleware logic exactly
        $isAdmin = isset($user['role']) && $user['role'] === 'Admin';
        $isMonthlySalaryEmployee = isset($user['role']) && $user['role'] === 'Employee' 
                                   && isset($user['salaryType']) && $user['salaryType'] === 'Monthly';

        if ($isAdmin || $isMonthlySalaryEmployee) {
            return $user;
        } else {
            http_response_code(403);
            echo json_encode(["message" => "Not authorized as an admin"]);
            exit();
        }
    }
    
    /**
     * Generate JWT token
     * 
     * @param string $id User ID
     * @param string $role User role (kept for backward compat but not used in Node.js token)
     * @return string JWT token
     */
    public static function generateToken($id, $role = null) {
        // Node.js token payload only has: { id }
        // We include role for convenience but Node.js only uses id
        $payload = [
            'iss' => "attendance_system",
            'iat' => time(),
            'exp' => time() + (30 * 24 * 60 * 60), // 30 days
            'id' => $id
        ];
        return self::encodeJWT($payload);
    }

    // --- JWT Implementation (No Dependencies) ---
    private static function encodeJWT($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    private static function decodeJWT($jwt) {
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) != 3) {
            return false;
        }
        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1]));
        $signatureProvided = $tokenParts[2];

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if (hash_equals($base64UrlSignature, $signatureProvided)) {
            return json_decode($payload);
        }
        return false;
    }
}
