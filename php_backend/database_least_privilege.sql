-- SQL to create necessary security tables
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    adminId VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    targetId VARCHAR(50),
    details JSON,
    ipAddress VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Script to create a least-privileged MySQL user on Hostinger
-- REPLACE 'new_app_user' and 'SuperSecurePassword123!' with your desired credentials
-- REPLACE 'adyacrm_db' with your actual database name in Hostinger
CREATE USER 'new_app_user'@'localhost' IDENTIFIED BY 'SuperSecurePassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON adyacrm_db.* TO 'new_app_user'@'localhost';
FLUSH PRIVILEGES;
