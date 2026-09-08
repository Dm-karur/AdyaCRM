<?php
/**
 * Application Configuration
 * Central config file for database credentials, JWT secret, and other settings.
 * Update these values to match your hosting environment.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'u772531024_adya');
define('DB_USER', 'u772531024_adya');
define('DB_PASS', 'Adyahome@2026');

// JWT Secret — must match the Node.js .env JWT_SECRET for token compatibility during migration
define('JWT_SECRET', 'supersecurejwtsecret');

// Upload directory (relative to php_backend root)
define('UPLOAD_DIR', __DIR__ . '/../../uploads');

// Nominatim reverse geocoding user-agent
define('GEOCODE_USER_AGENT', 'AttendanceSystem/1.0');
