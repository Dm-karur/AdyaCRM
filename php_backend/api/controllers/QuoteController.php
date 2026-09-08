<?php
namespace App\controllers;

use App\config\Database;
use App\models\Quote;
use App\models\Followup;
use App\middleware\AuthMiddleware;

class QuoteController {
    private $db;
    private $quoteModel;
    private $followupModel;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->quoteModel = new Quote($this->db);
        $this->followupModel = new Followup($this->db);
        
        // CRITICAL FIX: Use AuthMiddleware (not Auth which doesn't exist)
        $this->user = AuthMiddleware::protect();
    }

    private function generateObjectId() {
        return bin2hex(random_bytes(12));
    }

    /**
     * @desc    Create a new quote
     * @route   POST /api/quotes
     * @access  Private
     */
    public function createQuote() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['leadId'])) {
            http_response_code(400);
            echo json_encode(["message" => "Lead ID is required"]);
            return;
        }

        $items = isset($data['items']) ? $data['items'] : [];
        
        if (empty($items)) {
            if (isset($data['product']) && isset($data['model']) && isset($data['mrp']) && isset($data['discountedPrice'])) {
                $items = [[
                    'product' => $data['product'],
                    'model' => $data['model'],
                    'mrp' => $data['mrp'],
                    'discountedPrice' => $data['discountedPrice'],
                    'quantity' => 1
                ]];
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Please provide items for the quote"]);
                return;
            }
        }

        $quoteId = $this->generateObjectId();
        $quoteData = [
            'id' => $quoteId,
            'leadId' => $data['leadId'],
            'customerAddress' => $data['customerAddress'] ?? null
        ];

        if ($this->quoteModel->create($quoteData, $items)) {
            // Automatically generate a followup (matches Node.js)
            $productNames = implode(', ', array_column($items, 'product'));
            $totalDiscounted = 0;
            foreach ($items as $item) {
                $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
                $totalDiscounted += ((float)$item['discountedPrice'] * $qty);
            }

            $followupData = [
                'id' => $this->generateObjectId(),
                'leadId' => $data['leadId'],
                'date' => date('Y-m-d H:i:s'),
                'description' => "Generated Quote for: $productNames - Total: ₹" . number_format($totalDiscounted, 2),
                'status' => 'DONE'
            ];
            $this->followupModel->create($followupData);

            $created = $this->quoteModel->getById($quoteId);
            $created['_id'] = $created['id'];
            http_response_code(201);
            echo json_encode($created);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create quote"]);
        }
    }

    /**
     * @desc    Get quotes for a specific lead
     * @route   GET /api/quotes/lead/:leadId
     * @access  Private
     */
    public function getQuotesByLead($leadId) {
        $quotes = $this->quoteModel->getByLead($leadId);
        $formatted = array_map(function($q) {
            $q['_id'] = $q['id'];
            return $q;
        }, $quotes);
        echo json_encode($formatted);
    }
}
