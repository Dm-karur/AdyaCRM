<?php
date_default_timezone_set('Asia/Kolkata');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple autoloader since we aren't using composer
spl_autoload_register(function ($class) {
    // App\controllers\AuthController -> controllers/AuthController.php
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

// Apply global security headers
\App\middleware\SecurityHeaders::apply();

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Assuming it's hosted such that the request goes to /php_backend/api/...
// We need to extract the parts after /api/
$pathParts = explode('/api/', $requestUri);
$uri = isset($pathParts[1]) ? $pathParts[1] : '';

$uriSegments = explode('/', trim($uri, '/'));

$resource = $uriSegments[0] ?? '';
$action = $uriSegments[1] ?? '';
$id = $uriSegments[2] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

// Routing logic
if ($resource === 'auth') {
    $controller = new \App\controllers\AuthController();
    if ($method === 'POST' && $action === 'login') {
        $controller->login();
    } elseif ($method === 'POST' && $action === 'logout') {
        $controller->logout();
    } elseif ($method === 'POST' && $action === 'register-admin') {
        $controller->registerAdmin();
    } elseif ($method === 'GET' && $action === 'profile') {
        $controller->getProfile();
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found"]);
    }
} elseif ($resource === 'attendance') {
    $controller = new \App\controllers\AttendanceController();
    if ($method === 'POST' && $action === 'punch-in') {
        $controller->punchIn();
    } elseif ($method === 'POST' && $action === 'punch-out') {
        $controller->punchOut();
    } elseif ($method === 'GET' && $action === 'me') {
        $controller->getMyAttendance();
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found"]);
    }
} elseif ($resource === 'employees') {
    $controller = new \App\controllers\EmployeeController();
    $actionOrId = $uriSegments[1] ?? '';
    if ($method === 'POST' && empty($actionOrId)) {
        $controller->createEmployee();
    } elseif ($method === 'GET' && empty($actionOrId)) {
        $controller->getEmployees();
    } elseif ($method === 'PUT' && !empty($actionOrId)) {
        $controller->updateEmployee($actionOrId);
    } elseif ($method === 'DELETE' && !empty($actionOrId)) {
        $controller->deleteEmployee($actionOrId);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for employees"]);
    }
} elseif ($resource === 'customer-entries') {
    $controller = new \App\controllers\CustomerEntryController();
    $actionOrId = $uriSegments[1] ?? '';
    $subAction = $uriSegments[2] ?? '';
    
    if ($method === 'POST' && empty($actionOrId)) {
        $controller->createEntry();
    } elseif ($method === 'GET' && empty($actionOrId)) {
        $controller->getEmployeeEntries();
    } elseif ($method === 'GET' && $actionOrId === 'all') {
        $controller->getAllEntries();
    } elseif ($method === 'PUT' && $subAction === 'status' && !empty($actionOrId)) {
        $controller->updateEntryStatus($actionOrId);
    } elseif ($method === 'POST' && $subAction === 'photo' && !empty($actionOrId)) {
        $controller->updateEntryPhoto($actionOrId);
    } elseif ($method === 'POST' && $subAction === 'bills' && !empty($actionOrId)) {
        $controller->uploadEntryBill($actionOrId);
    } elseif ($method === 'POST' && $subAction === 'purchase-bills' && !empty($actionOrId)) {
        $controller->addPurchaseBill($actionOrId);
    } elseif ($method === 'DELETE' && !empty($actionOrId) && empty($subAction)) {
        $controller->deleteEntry($actionOrId);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for customer-entries"]);
    }
} elseif ($resource === 'followups') {
    $controller = new \App\controllers\FollowupController();
    $actionOrId = $uriSegments[1] ?? '';
    $subAction = $uriSegments[2] ?? '';
    
    if ($method === 'POST' && empty($actionOrId)) {
        $controller->createFollowup();
    } elseif ($method === 'GET' && empty($actionOrId)) {
        $controller->getAllFollowups();
    } elseif ($method === 'GET' && $actionOrId === 'lead' && !empty($subAction)) {
        $controller->getFollowupsByLead($subAction);
    } elseif ($method === 'PUT' && $subAction === 'status' && !empty($actionOrId)) {
        $controller->updateFollowupStatus($actionOrId);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for followups"]);
    }
} elseif ($resource === 'quotes') {
    $controller = new \App\controllers\QuoteController();
    $actionOrId = $uriSegments[1] ?? '';
    $subAction = $uriSegments[2] ?? '';
    
    if ($method === 'POST' && empty($actionOrId)) {
        $controller->createQuote();
    } elseif ($method === 'GET' && $actionOrId === 'lead' && !empty($subAction)) {
        $controller->getQuotesByLead($subAction);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for quotes"]);
    }
} elseif ($resource === 'leaves') {
    $controller = new \App\controllers\LeaveController();
    $actionOrId = $uriSegments[1] ?? '';
    $subAction = $uriSegments[2] ?? '';
    
    if ($method === 'POST' && empty($actionOrId)) {
        $controller->applyLeave();
    } elseif ($method === 'GET' && $actionOrId === 'me') {
        $controller->getMyLeaves();
    } elseif ($method === 'GET' && empty($actionOrId)) {
        $controller->getAllLeaves();
    } elseif ($method === 'PUT' && $subAction === 'status' && !empty($actionOrId)) {
        $controller->updateLeaveStatus($actionOrId);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for leaves"]);
    }
} elseif ($resource === 'branches') {
    $controller = new \App\controllers\BranchController();
    $actionOrId = $uriSegments[1] ?? '';
    
    if ($method === 'GET' && empty($actionOrId)) {
        $controller->getBranches();
    } elseif ($method === 'POST' && empty($actionOrId)) {
        $controller->createBranch();
    } elseif ($method === 'PUT' && !empty($actionOrId)) {
        $controller->updateBranch($actionOrId);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found for branches"]);
    }
} elseif ($resource === 'admin') {
    $controller = new \App\controllers\AdminController();
    $entity = $uriSegments[1] ?? '';
    $actionOrId = $uriSegments[2] ?? '';
    
    if ($entity === 'employees') {
        if ($method === 'GET' && empty($actionOrId)) {
            $controller->getEmployees();
        } elseif ($method === 'DELETE' && !empty($actionOrId)) {
            $controller->removeEmployee($actionOrId);
        }
    } elseif ($entity === 'attendance') {
        if ($method === 'POST' && $actionOrId === 'manual') {
            $controller->addManualAttendance();
        } elseif ($method === 'POST' && $actionOrId === 'mark-leave') {
            $controller->markAsLeave();
        } elseif ($method === 'POST' && $actionOrId === 'mark-holiday') {
            $controller->markHoliday();
        } elseif ($method === 'POST' && $actionOrId === 'remove-holiday') {
            $controller->removeHoliday();
        } elseif ($method === 'POST' && $actionOrId === 'convert-overtime') {
            $controller->convertOvertime();
        } elseif ($method === 'GET' && !empty($actionOrId)) {
            $controller->getEmployeeAttendance($actionOrId);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Admin attendance endpoint not found"]);
        }
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Admin endpoint not found"]);
    }
} else {
    http_response_code(404);
    echo json_encode(["message" => "Endpoint not found: " . $resource]);
}
