<?php
namespace App\controllers;

use App\config\Database;
use App\models\CustomerEntry;
use App\middleware\AuthMiddleware;

class CustomerEntryController {
    private $db;
    private $customerEntry;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->customerEntry = new CustomerEntry($this->db);
        
        // CRITICAL FIX: Use AuthMiddleware (not Auth which doesn't exist)
        $this->user = AuthMiddleware::protect();
    }

    private function generateObjectId() {
        return bin2hex(random_bytes(12));
    }

    private function formatEntry($e) {
        $e['employeeId'] = [
            '_id' => $e['employeeId'] ?? null,
            'name' => $e['employee_name'] ?? null,
            'employeeId' => $e['employee_code'] ?? null,
            'department' => $e['employee_department'] ?? null,
            'brand' => $e['employee_brand'] ?? null,
            'branch' => $e['employee_branch'] ?? null
        ];
        $e['bills'] = $this->customerEntry->getBills($e['id']);
        $e['purchaseBills'] = $this->customerEntry->getPurchaseBills($e['id']);
        $e['_id'] = $e['id'];
        $e['createdAt'] = $e['created_at'] ?? null;
        $e['updatedAt'] = $e['updated_at'] ?? null;
        return $e;
    }

    /**
     * @desc    Create a new lead/entry
     * @route   POST /api/customer-entries
     * @access  Private
     */
    public function createEntry() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Handle multipart/form-data if photo is uploaded
        if (empty($data)) {
            $data = $_POST;
        }

        $phone = $data['phone'] ?? null;
        $name = $data['name'] ?? null;

        if (!$name || !$phone) {
            http_response_code(400);
            echo json_encode(["message" => "Name and phone are required"]);
            return;
        }

        $existingByPhone = $this->customerEntry->getByPhone($phone);
        if ($existingByPhone) {
            http_response_code(409);
            echo json_encode(["message" => "User with this phone number already exists", "existingLead" => $this->formatEntry($existingByPhone)]);
            return;
        }

        $existingByName = $this->customerEntry->getByNameExact($name);
        if ($existingByName) {
            $isClient = $existingByName['status'] === 'QUALIFIED' || $existingByName['status'] === 'QUALIFIED LEAD';
            $location = $isClient ? 'Clients' : 'Leads';
            http_response_code(409);
            echo json_encode(["message" => "Name already exists in " . $location]);
            return;
        }

        $photoPath = null;
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] == 0) {
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            $fileName = time() . '_' . basename($_FILES['photo']['name']);
            $targetFilePath = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['photo']['tmp_name'], $targetFilePath)) {
                $photoPath = '/uploads/' . $fileName;
            }
        }

        $entryId = $this->generateObjectId();

        $entryData = [
            'id' => $entryId,
            'employeeId' => $this->user['id'],
            'name' => $name,
            'company' => $data['company'] ?? '-',
            'email' => $data['email'] ?? '-',
            'phone' => $phone,
            'status' => $data['status'] ?? 'NEW LEAD',
            'source' => $data['source'] ?? 'WEBSITE',
            'serviceInterest' => $data['serviceInterest'] ?? '-',
            'budget' => $data['budget'] ?? '-',
            'priority' => $data['priority'] ?? 'WARM',
            'photo' => $photoPath,
            'brand' => $this->user['brand'] ?? 'None',
            'branch' => $this->user['branch'] ?? 'Main'
        ];

        if ($this->customerEntry->create($entryData)) {
            $created = $this->customerEntry->getById($entryId);
            http_response_code(201);
            echo json_encode($this->formatEntry($created));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create lead"]);
        }
    }

    /**
     * @desc    Get all leads for logged in user
     * @route   GET /api/customer-entries
     * @access  Private
     */
    public function getEmployeeEntries() {
        $entries = $this->customerEntry->getEmployeeEntries($this->user['id']);
        $formatted = array_map([$this, 'formatEntry'], $entries);
        echo json_encode($formatted);
    }

    /**
     * @desc    Get all leads (Admin)
     * @route   GET /api/customer-entries/all
     * @access  Private/Admin
     */
    public function getAllEntries() {
        // Admin check
        AuthMiddleware::admin($this->user);

        $entries = $this->customerEntry->getAllEntries($this->user['role'], $this->user['branch'] ?? null);
        $formatted = array_map([$this, 'formatEntry'], $entries);
        echo json_encode($formatted);
    }

    /**
     * @desc    Update lead status
     * @route   PUT /api/customer-entries/:id/status
     * @access  Private
     */
    public function updateEntryStatus($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? null;
        
        $entry = $this->customerEntry->getById($id);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(["message" => "Lead not found"]);
            return;
        }

        if ($this->customerEntry->updateStatus($id, $status)) {
            $updated = $this->customerEntry->getById($id);
            echo json_encode($this->formatEntry($updated));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update status"]);
        }
    }

    /**
     * @desc    Delete a lead/entry
     * @route   DELETE /api/customer-entries/:id
     * @access  Private
     */
    public function deleteEntry($id) {
        $entry = $this->customerEntry->getById($id);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(["message" => "Lead not found"]);
            return;
        }

        if ($this->customerEntry->delete($id)) {
            echo json_encode(["message" => "Lead removed"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete lead"]);
        }
    }

    /**
     * @desc    Update lead photo
     * @route   PUT /api/customer-entries/:id/photo
     * @access  Private
     */
    public function updateEntryPhoto($id) {
        $entry = $this->customerEntry->getById($id);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(["message" => "Lead not found"]);
            return;
        }

        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] != 0) {
            http_response_code(400);
            echo json_encode(["message" => "No image uploaded"]);
            return;
        }

        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $fileName = time() . '_' . basename($_FILES['photo']['name']);
        $targetFilePath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['photo']['tmp_name'], $targetFilePath)) {
            $photoPath = '/uploads/' . $fileName;
            if ($this->customerEntry->updatePhoto($id, $photoPath)) {
                $updated = $this->customerEntry->getById($id);
                echo json_encode($this->formatEntry($updated));
                return;
            }
        }
        
        http_response_code(500);
        echo json_encode(["message" => "Failed to upload photo"]);
    }

    /**
     * @desc    Upload bill for a lead
     * @route   PUT /api/customer-entries/:id/bills
     * @access  Private
     */
    public function uploadEntryBill($id) {
        $entry = $this->customerEntry->getById($id);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(["message" => "Lead not found"]);
            return;
        }

        if (!isset($_FILES['bill']) || $_FILES['bill']['error'] != 0) {
            http_response_code(400);
            echo json_encode(["message" => "No file uploaded"]);
            return;
        }

        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $fileName = time() . '_' . basename($_FILES['bill']['name']);
        $targetFilePath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['bill']['tmp_name'], $targetFilePath)) {
            $url = '/uploads/' . $fileName;
            $originalName = $_FILES['bill']['name'];
            
            if ($this->customerEntry->addBill($id, $url, $originalName)) {
                $updated = $this->customerEntry->getById($id);
                echo json_encode($this->formatEntry($updated));
                return;
            }
        }

        http_response_code(500);
        echo json_encode(["message" => "Failed to upload bill"]);
    }

    /**
     * @desc    Add a purchase bill for frequent purchases
     * @route   POST /api/customer-entries/:id/purchase-bills
     * @access  Private
     */
    public function addPurchaseBill($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $billNumber = $data['billNumber'] ?? null;
        $billedDate = $data['billedDate'] ?? null;
        $product = $data['product'] ?? null;

        if (!$billNumber || !$billedDate) {
            http_response_code(400);
            echo json_encode(["message" => "Bill number and date are required"]);
            return;
        }

        $entry = $this->customerEntry->getById($id);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(["message" => "Lead not found"]);
            return;
        }

        if ($this->customerEntry->addPurchaseBill($id, $billNumber, $billedDate, $product)) {
            $updated = $this->customerEntry->getById($id);
            echo json_encode($this->formatEntry($updated));
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add purchase bill"]);
        }
    }
}
