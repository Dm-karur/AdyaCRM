<?php
namespace App\controllers;

use App\config\Database;
use App\models\User;
use App\models\Attendance;
use App\models\AuditLog;
use App\middleware\AuthMiddleware;

class AdminController {
    private $db;
    private $userModel;
    private $attendanceModel;
    private $auditLog;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
        $this->attendanceModel = new Attendance($this->db);
        $this->auditLog = new AuditLog($this->db);
        
        // CRITICAL FIX: Use AuthMiddleware (not Auth which doesn't exist)
        $this->user = AuthMiddleware::admin();
    }

    private function generateId() {
        return bin2hex(random_bytes(12));
    }

    /**
     * @desc    Get all employees
     * @route   GET /api/admin/employees
     * @access  Private/Admin
     */
    public function getEmployees() {
        $users = $this->userModel->getAll();
        
        // Filter by brand if not full Admin (matches Node.js logic)
        if ($this->user['role'] !== 'Admin') {
            $brand = $this->user['brand'] ?? null;
            $users = array_filter($users, function($u) use ($brand) {
                return ($u['brand'] ?? null) === $brand;
            });
            $users = array_values($users);
        }
        
        echo json_encode($users);
    }

    /**
     * @desc    Get attendance of a specific employee
     * @route   GET /api/admin/attendance/:employeeId
     * @access  Private/Admin
     */
    public function getEmployeeAttendance($employeeId) {
        $records = $this->attendanceModel->getMyAttendance($employeeId);
        
        $formatted = array_map(function($record) {
            return Attendance::formatForFrontend($record);
        }, $records);

        echo json_encode($formatted);
    }

    /**
     * @desc    Remove an employee
     * @route   DELETE /api/admin/employees/:id
     * @access  Private/Admin
     */
    public function removeEmployee($id) {
        if ($id === $this->user['id'] || $id === ($this->user['_id'] ?? null)) {
            http_response_code(400);
            echo json_encode(["message" => "Cannot remove yourself"]);
            return;
        }
        
        $user = $this->userModel->findById($id);
        if (!$user) {
            http_response_code(404);
            echo json_encode(["message" => "Employee not found"]);
            return;
        }

        if ($this->userModel->delete($id)) {
            echo json_encode(["message" => "Employee removed successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete employee"]);
        }
    }

    /**
     * @desc    Add manual attendance
     * @route   POST /api/admin/attendance/manual
     * @access  Private/Admin
     */
    public function addManualAttendance() {
        $data = json_decode(file_get_contents("php://input"), true);
        $employeeId = $data['employeeId'];
        $date = date('Y-m-d', strtotime($data['date']));

        $existing = $this->attendanceModel->findTodayByEmployee($employeeId, $date);
        
        if (!$existing) {
            // Create new attendance record with minimal fields
            $userTarget = $this->userModel->findById($employeeId);
            $id = $this->generateId();
            
            $createData = [
                'id' => $id,
                'employeeId' => $employeeId,
                'employeeName' => $userTarget['name'] ?? '',
                'department' => $userTarget['department'] ?? '',
                'date' => $date,
                'status' => $data['status'] ?? 'Present',
                'isManualEntry' => 1,
                'manualEntryReason' => $data['reason'] ?? 'Manual Update',
                'manualEnteredBy' => $this->user['id']
            ];

            // Add punch times if provided
            if (!empty($data['punchInTime'])) {
                $createData['punchIn_time'] = date('Y-m-d H:i:s', strtotime($data['punchInTime']));
            }
            if (!empty($data['punchOutTime'])) {
                $createData['punchOut_time'] = date('Y-m-d H:i:s', strtotime($data['punchOutTime']));
            }

            $this->attendanceModel->create($createData);
        } else {
            $id = $existing['id'];
            
            // Update existing record
            $updateData = [
                'isManualEntry' => 1,
                'manualEntryReason' => $data['reason'] ?? 'Manual Update',
                'manualEnteredBy' => $this->user['id'],
                'status' => $data['status'] ?? 'Present'
            ];
            
            if (!empty($data['punchInTime'])) {
                $updateData['punchIn_time'] = date('Y-m-d H:i:s', strtotime($data['punchInTime']));
            }
            if (!empty($data['punchOutTime'])) {
                $updateData['punchOut_time'] = date('Y-m-d H:i:s', strtotime($data['punchOutTime']));
            }
            
            $this->attendanceModel->updateFields($id, $updateData);
        }
        
        // Log action
        $this->auditLog->create([
            'id' => $this->generateId(),
            'adminId' => $this->user['id'],
            'action' => 'MANUAL_ATTENDANCE',
            'targetId' => $employeeId,
            'details' => ['date' => $date, 'reason' => $data['reason'] ?? '']
        ]);

        $updated = $this->attendanceModel->findTodayByEmployee($employeeId, $date);
        echo json_encode(Attendance::formatForFrontend($updated));
    }

    /**
     * @desc    Convert overtime to days
     * @route   POST /api/admin/attendance/convert-overtime
     * @access  Private/Admin
     */
    public function convertOvertime() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $this->auditLog->create([
            'id' => $this->generateId(),
            'adminId' => $this->user['id'],
            'action' => 'OVERTIME_CONVERTED',
            'targetId' => $data['employeeId'] ?? null,
            'details' => ['convertedMinutes' => $data['overtimeMinutesToConvert'] ?? 0]
        ]);

        echo json_encode(["message" => "Overtime converted successfully"]);
    }

    /**
     * @desc    Mark employee as on leave for a specific day
     * @route   POST /api/admin/attendance/mark-leave
     * @access  Private/Admin
     */
    public function markAsLeave() {
        $data = json_decode(file_get_contents("php://input"), true);
        $employeeId = $data['employeeId'];
        $date = date('Y-m-d', strtotime($data['date']));

        $existing = $this->attendanceModel->findTodayByEmployee($employeeId, $date);
        
        if (!$existing) {
            $userTarget = $this->userModel->findById($employeeId);
            $id = $this->generateId();
            
            $this->attendanceModel->create([
                'id' => $id,
                'employeeId' => $employeeId,
                'employeeName' => $userTarget['name'] ?? '',
                'department' => $userTarget['department'] ?? '',
                'date' => $date,
                'status' => 'Leave',
                'isManualEntry' => 1,
                'manualEntryReason' => $data['reason'] ?? '',
                'manualEnteredBy' => $this->user['id']
            ]);
        } else {
            $id = $existing['id'];
            
            $this->attendanceModel->updateFields($id, [
                'status' => 'Leave',
                'isManualEntry' => 1,
                'manualEntryReason' => $data['reason'] ?? '',
                'manualEnteredBy' => $this->user['id']
            ]);
        }

        $this->auditLog->create([
            'id' => $this->generateId(),
            'adminId' => $this->user['id'],
            'action' => 'MARKED_AS_LEAVE',
            'targetId' => $employeeId,
            'details' => ['date' => $date, 'reason' => $data['reason'] ?? '']
        ]);

        $updated = $this->attendanceModel->findTodayByEmployee($employeeId, $date);
        echo json_encode(Attendance::formatForFrontend($updated));
    }

    /**
     * @desc    Mark a specific day as a Holiday for all active employees
     * @route   POST /api/admin/attendance/mark-holiday
     * @access  Private/Admin
     */
    public function markHoliday() {
        $data = json_decode(file_get_contents("php://input"), true);
        $date = date('Y-m-d', strtotime($data['date']));
        $reason = $data['reason'] ?? 'Public Holiday';

        $users = $this->userModel->getAll();
        $count = 0;

        foreach ($users as $u) {
            if ($u['isActive']) {
                $uid = $u['_id'] ?? $u['id'];
                $existing = $this->attendanceModel->findTodayByEmployee($uid, $date);
                
                if (!$existing) {
                    $id = $this->generateId();
                    $this->attendanceModel->create([
                        'id' => $id,
                        'employeeId' => $uid,
                        'employeeName' => $u['name'],
                        'department' => $u['department'] ?? '',
                        'date' => $date,
                        'status' => 'Holiday',
                        'isManualEntry' => 1,
                        'manualEntryReason' => $reason,
                        'manualEnteredBy' => $this->user['id']
                    ]);
                } else {
                    $this->attendanceModel->updateFields($existing['id'], [
                        'status' => 'Holiday',
                        'isManualEntry' => 1,
                        'manualEntryReason' => $reason,
                        'manualEnteredBy' => $this->user['id']
                    ]);
                }
                $count++;
            }
        }

        $this->auditLog->create([
            'id' => $this->generateId(),
            'adminId' => $this->user['id'],
            'action' => 'MARKED_HOLIDAY_FOR_ALL',
            'targetId' => $this->user['id'],
            'details' => ['date' => $date, 'reason' => $reason, 'count' => $count]
        ]);

        echo json_encode([
            "message" => "Holiday marked successfully for $count employees", 
            "count" => $count
        ]);
    }

    /**
     * @desc    Remove a specific holiday for all employees
     * @route   POST /api/admin/attendance/remove-holiday
     * @access  Private/Admin
     */
    public function removeHoliday() {
        $data = json_decode(file_get_contents("php://input"), true);
        $date = date('Y-m-d', strtotime($data['date']));

        $count = $this->attendanceModel->deleteByDateAndStatus($date, 'Holiday');

        $this->auditLog->create([
            'id' => $this->generateId(),
            'adminId' => $this->user['id'],
            'action' => 'REMOVED_HOLIDAY_FOR_ALL',
            'targetId' => $this->user['id'],
            'details' => ['date' => $date, 'count' => $count]
        ]);

        echo json_encode([
            "message" => "Holiday removed successfully. $count attendance records deleted."
        ]);
    }
}
