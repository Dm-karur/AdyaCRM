<?php
namespace App\controllers;

use App\config\Database;
use App\models\Followup;
use App\middleware\AuthMiddleware;

class FollowupController {
    private $db;
    private $followupModel;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->followupModel = new Followup($this->db);
        
        // CRITICAL FIX: Use AuthMiddleware (not Auth which doesn't exist)
        $this->user = AuthMiddleware::protect();
    }

    private function generateObjectId() {
        return bin2hex(random_bytes(12));
    }

    private function formatFollowup($f) {
        if (isset($f['lead_name'])) {
            $f['leadId'] = [
                '_id' => $f['leadId'],
                'name' => $f['lead_name'],
                'company' => $f['lead_company'],
                'email' => $f['lead_email'],
                'phone' => $f['lead_phone'],
                'status' => $f['lead_status'],
                'source' => $f['lead_source'],
                'priority' => $f['lead_priority']
            ];
        }
        if (isset($f['creator_name'])) {
            $f['creatorName'] = $f['creator_name'];
        }
        $f['_id'] = $f['id'];
        return $f;
    }

    /**
     * @desc    Create a new follow-up
     * @route   POST /api/followups
     * @access  Private
     */
    public function createFollowup() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['leadId']) || empty($data['date']) || empty($data['description'])) {
            http_response_code(400);
            echo json_encode(["message" => "Please provide all required fields"]);
            return;
        }

        $id = $this->generateObjectId();

        $followupData = [
            'id' => $id,
            'leadId' => $data['leadId'],
            'date' => $data['date'],
            'description' => $data['description'],
            'status' => $data['status'] ?? 'PENDING',
            'createdBy' => $this->user['id'] ?? null
        ];

        if ($this->followupModel->create($followupData)) {
            $created = $this->followupModel->getById($id);
            http_response_code(201);
            echo json_encode($this->formatFollowup($created));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create follow-up"]);
        }
    }

    /**
     * @desc    Get all follow-ups (Admin)
     * @route   GET /api/followups
     * @access  Private/Admin
     */
    public function getAllFollowups() {
        // Admin check
        AuthMiddleware::admin($this->user);

        $followups = $this->followupModel->getAll($this->user['role'], $this->user['branch'] ?? null);
        $formatted = array_map([$this, 'formatFollowup'], $followups);
        
        echo json_encode($formatted);
    }

    /**
     * @desc    Get follow-ups for a specific lead
     * @route   GET /api/followups/lead/:leadId
     * @access  Private
     */
    public function getFollowupsByLead($leadId) {
        $followups = $this->followupModel->getByLead($leadId);
        $formatted = array_map([$this, 'formatFollowup'], $followups);
        
        echo json_encode($formatted);
    }

    /**
     * @desc    Update follow-up status
     * @route   PUT /api/followups/:id/status
     * @access  Private
     */
    public function updateFollowupStatus($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? null;

        $followup = $this->followupModel->getById($id);
        if (!$followup) {
            http_response_code(404);
            echo json_encode(["message" => "Follow-up not found"]);
            return;
        }

        if ($this->followupModel->updateStatus($id, $status)) {
            $updated = $this->followupModel->getById($id);
            echo json_encode($this->formatFollowup($updated));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update follow-up status"]);
        }
    }
}
