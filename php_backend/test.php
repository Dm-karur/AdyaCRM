<?php
require_once __DIR__ . '/api/config/Database.php';
require_once __DIR__ . '/api/models/User.php';

$database = new \App\config\Database();
$db = $database->getConnection();
$userModel = new \App\models\User($db);

$data = [
    'id' => bin2hex(random_bytes(12)),
    'name' => 'testemployee',
    'employeeId' => 'testemployee',
    'password' => 'password',
    'role' => 'Employee',
    'department' => 'General',
    'shift' => 'General',
    'isFieldWorker' => false,
    'salary' => 25,
    'salaryType' => 'Monthly',
    'shiftStart' => '09:00',
    'shiftEnd' => '18:00',
    'brand' => 'Bosch',
    'branch' => 'Theni'
];

$res = $userModel->create($data);
echo "Created: " . ($res ? "true" : "false") . "\n";

$inserted = $userModel->findByEmployeeId('testemployee');
echo "Branch in DB: " . $inserted['branch'] . "\n";

// cleanup
$userModel->delete($inserted['id']);
