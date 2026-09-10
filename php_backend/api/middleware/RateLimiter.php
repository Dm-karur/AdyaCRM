<?php
namespace App\middleware;

use App\config\Database;
use PDO;

class RateLimiter {
    private $db;
    private $maxAttempts = 5;
    private $timeframeMinutes = 15;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * Check if the given IP has exceeded the allowed attempts
     * @param string $ip
     * @return bool True if allowed, False if blocked
     */
    public function checkRateLimit($ip) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = :ip AND attempt_time > DATE_SUB(NOW(), INTERVAL :timeframe MINUTE)");
        $stmt->bindParam(':ip', $ip);
        $stmt->bindParam(':timeframe', $this->timeframeMinutes, PDO::PARAM_INT);
        $stmt->execute();
        
        $attempts = $stmt->fetchColumn();
        return $attempts < $this->maxAttempts;
    }

    /**
     * Record a failed login attempt
     * @param string $ip
     */
    public function recordFailedAttempt($ip) {
        $stmt = $this->db->prepare("INSERT INTO login_attempts (ip_address) VALUES (:ip)");
        $stmt->bindParam(':ip', $ip);
        $stmt->execute();
    }

    /**
     * Clear failed attempts after successful login
     * @param string $ip
     */
    public function clearAttempts($ip) {
        $stmt = $this->db->prepare("DELETE FROM login_attempts WHERE ip_address = :ip");
        $stmt->bindParam(':ip', $ip);
        $stmt->execute();
    }
}
