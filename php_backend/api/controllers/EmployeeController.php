<?php
namespace App\controllers;

use App\config\Database;
use App\models\User;
use App\middleware\AuthMiddleware;

class EmployeeController {
    private $db;
    private $userModel;
    private $admin;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
        // Protect routes and ensure admin access
        $this->admin = AuthMiddleware::admin();
    }

    private function generateId() {
        return bin2hex(random_bytes(12));
    }

    /**
     * @desc    Register a new employee
     * @route   POST /api/employees
     * @access  Private/Admin
     */
    public function createEmployee() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name) || empty($data->employeeId) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Name, Employee ID, and Password are required"]);
            return;
        }

        $userExists = $this->userModel->findByEmployeeId($data->employeeId);
        if ($userExists) {
            http_response_code(400);
            echo json_encode(["message" => "Employee already exists"]);
            return;
        }

        $id = $this->generateId();
        
        $insertData = [
            'id' => $id,
            'name' => $data->name,
            'employeeId' => $data->employeeId,
            'password' => $data->password,
            'role' => isset($data->role) ? $data->role : 'Employee',
            'department' => isset($data->department) ? $data->department : 'General',
            'shift' => isset($data->shift) ? $data->shift : 'General',
            'isFieldWorker' => isset($data->isFieldWorker) ? $data->isFieldWorker : false,
            'salary' => isset($data->salary) ? $data->salary : 0,
            'salaryType' => isset($data->salaryType) ? $data->salaryType : 'Monthly',
            'shiftStart' => isset($data->shiftStart) ? $data->shiftStart : '09:00',
            'shiftEnd' => isset($data->shiftEnd) ? $data->shiftEnd : '18:00',
            'brand' => isset($data->brand) ? $data->brand : 'None',
            'branch' => isset($data->branch) ? $data->branch : 'Main',
            'allow_outside_radius' => isset($data->allow_outside_radius) ? $data->allow_outside_radius : false
        ];

        if ($this->userModel->create($insertData)) {
            http_response_code(201);
            echo json_encode([
                "_id" => $id,
                "name" => $insertData['name'],
                "employeeId" => $insertData['employeeId'],
                "role" => $insertData['role'],
                "salary" => $insertData['salary'],
                "salaryType" => $insertData['salaryType'],
                "shiftStart" => $insertData['shiftStart'],
                "shiftEnd" => $insertData['shiftEnd'],
                "brand" => $insertData['brand'],
                "branch" => $insertData['branch']
            ]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Invalid employee data"]);
        }
    }

    /**
     * @desc    Get all employees
     * @route   GET /api/employees
     * @access  Private/Admin
     */
    public function getEmployees() {
        if ($this->admin['role'] === 'Admin') {
            $users = $this->userModel->getAll();
        } else {
            // Regular employees only see their own branch's employees
            $users = $this->userModel->getByBranch($this->admin['branch'] ?? 'Main');
        }
        echo json_encode($users);
    }

    /**
     * @desc    Update employee profile
     * @route   PUT /api/employees/:id
     * @access  Private/Admin
     */
    public function updateEmployee($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data)) {
            $data = $_POST;
        }

        $user = $this->userModel->findById($id);
        if (!$user) {
            http_response_code(404);
            echo json_encode(["message" => "User not found"]);
            return;
        }

        if ($this->userModel->update($id, $data)) {
            $updatedUser = $this->userModel->findById($id);
            echo json_encode($updatedUser);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update employee"]);
        }
    }

    /**
     * @desc    Delete employee
     * @route   DELETE /api/employees/:id
     * @access  Private/Admin
     */
    public function deleteEmployee($id) {
        $user = $this->userModel->findById($id);
        if (!$user) {
            http_response_code(404);
            echo json_encode(["message" => "User not found"]);
            return;
        }

        if ($this->userModel->delete($id)) {
            echo json_encode(["message" => "Employee removed"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete employee"]);
        }
    }
}
