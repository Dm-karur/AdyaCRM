<?php
namespace App\middleware;

class SecurityHeaders {
    public static function apply() {
        // Prevent Clickjacking
        header("X-Frame-Options: DENY");
        
        // Prevent MIME type sniffing
        header("X-Content-Type-Options: nosniff");
        
        // Enable XSS protection in legacy browsers
        header("X-XSS-Protection: 1; mode=block");
        
        // Strict Transport Security (enforce HTTPS for 1 year)
        // Uncomment if you have SSL setup on Hostinger (recommended)
        header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
        
        // Content Security Policy
        // Restricts where scripts, images, etc. can be loaded from.
        header("Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; connect-src 'self' https:;");
    }
}
