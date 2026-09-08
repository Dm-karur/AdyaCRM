<?php
namespace App\controllers;

use App\config\Database;
use App\models\Leave;
use App\middleware\AuthMiddleware;

class LeaveController {
    private $db;
    private $leaveModel;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->leaveModel = new Leave($this->db);
        
        // CRITICAL FIX: Use AuthMiddleware (not Auth which doesn't exist)
        $this->user = AuthMiddleware::protect();
    }

    private function generateObjectId() {
        return bin2hex(random_bytes(12));
    }

    /**
     * @desc    Apply for a leave
     * @route   POST /api/leaves
     * @access  Private
     */
    public function applyLeave() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['type']) || empty($data['startDate']) || empty($data['endDate']) || empty($data['reason'])) {
            http_response_code(400);
            echo json_encode(["message" => "Please provide all required fields"]);
            return;
        }

        $id = $this->generateObjectId();

        $leaveData = [
            'id' => $id,
            'employeeId' => $this->user['id'],
            'type' => $data['type'],
            'startDate' => $data['startDate'],
            'endDate' => $data['endDate'],
            'reason' => $data['reason']
        ];

        if ($this->leaveModel->create($leaveData)) {
            $created = $this->leaveModel->getById($id);
            $created['_id'] = $created['id'];
            http_response_code(201);
            echo json_encode($created);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to apply for leave"]);
        }
    }

    /**
     * @desc    Get all leaves for logged-in user
     * @route   GET /api/leaves/me
     * @access  Private
     */
    public function getMyLeaves() {
        $leaves = $this->leaveModel->getMyLeaves($this->user['id']);
        $formatted = array_map(function($l) {
            $l['_id'] = $l['id'];
            return $l;
        }, $leaves);
        
        echo json_encode($formatted);
    }

    /**
     * @desc    Get all leaves
     * @route   GET /api/leaves
     * @access  Private/Admin
     */
    public function getAllLeaves() {
        // Admin check
        AuthMiddleware::admin($this->user);

        $leaves = $this->leaveModel->getAllLeaves();
        $formatted = array_map(function($l) {
            $l['_id'] = $l['id'];
            if (isset($l['employee_name'])) {
                $l['employeeId'] = [
                    '_id' => $l['employeeId'],
                    'name' => $l['employee_name'],
                    'employeeId' => $l['employee_code']
                ];
            }
            return $l;
        }, $leaves);
        
        echo json_encode($formatted);
    }

    /**
     * @desc    Update leave status
     * @route   PUT /api/leaves/:id/status
     * @access  Private/Admin
     */
    public function updateLeaveStatus($id) {
        // Admin check
        AuthMiddleware::admin($this->user);

        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? 'Pending';
        $adminComment = $data['adminComment'] ?? null;

        $leave = $this->leaveModel->getById($id);
        if (!$leave) {
            http_response_code(404);
            echo json_encode(["message" => "Leave request not found"]);
            return;
        }

        if ($this->leaveModel->updateStatus($id, $status, $adminComment, $this->user['id'])) {
            $updated = $this->leaveModel->getById($id);
            $updated['_id'] = $updated['id'];
            echo json_encode($updated);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update leave status"]);
        }
    }
}
