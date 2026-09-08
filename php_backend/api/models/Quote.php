<?php
namespace App\models;

class Quote {
    private $conn;
    private $table_name = "quotes";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data, $items) {
        try {
            $this->conn->beginTransaction();

            $query = "INSERT INTO " . $this->table_name . " (id, leadId, customerAddress) 
                      VALUES (:id, :leadId, :customerAddress)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $data['id']);
            $stmt->bindParam(":leadId", $data['leadId']);
            $stmt->bindParam(":customerAddress", $data['customerAddress']);
            $stmt->execute();

            $itemQuery = "INSERT INTO quote_items (quote_id, product, model, quantity, mrp, discountedPrice)
                          VALUES (:quote_id, :product, :model, :quantity, :mrp, :discountedPrice)";
            $itemStmt = $this->conn->prepare($itemQuery);

            foreach ($items as $item) {
                $itemStmt->bindValue(":quote_id", $data['id']);
                $itemStmt->bindValue(":product", $item['product']);
                $itemStmt->bindValue(":model", $item['model']);
                $itemStmt->bindValue(":quantity", isset($item['quantity']) ? $item['quantity'] : 1);
                $itemStmt->bindValue(":mrp", $item['mrp']);
                $itemStmt->bindValue(":discountedPrice", $item['discountedPrice']);
                $itemStmt->execute();
            }

            $this->conn->commit();
            return true;
        } catch (\Exception $e) {
            $this->conn->rollBack();
            return false;
        }
    }

    public function getByLead($leadId) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE leadId = :leadId ORDER BY date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":leadId", $leadId);
        $stmt->execute();
        
        $quotes = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Fetch items for each quote
        foreach ($quotes as &$quote) {
            $itemQuery = "SELECT * FROM quote_items WHERE quote_id = :quote_id";
            $itemStmt = $this->conn->prepare($itemQuery);
            $itemStmt->bindParam(":quote_id", $quote['id']);
            $itemStmt->execute();
            $quote['items'] = $itemStmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // Map legacy fields from first item
            if (count($quote['items']) > 0) {
                $quote['product'] = $quote['items'][0]['product'];
                $quote['model'] = $quote['items'][0]['model'];
                $quote['mrp'] = $quote['items'][0]['mrp'];
                $quote['discountedPrice'] = $quote['items'][0]['discountedPrice'];
            }
        }
        
        return $quotes;
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        $quote = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($quote) {
            $itemQuery = "SELECT * FROM quote_items WHERE quote_id = :quote_id";
            $itemStmt = $this->conn->prepare($itemQuery);
            $itemStmt->bindParam(":quote_id", $quote['id']);
            $itemStmt->execute();
            $quote['items'] = $itemStmt->fetchAll(\PDO::FETCH_ASSOC);

            if (count($quote['items']) > 0) {
                $quote['product'] = $quote['items'][0]['product'];
                $quote['model'] = $quote['items'][0]['model'];
                $quote['mrp'] = $quote['items'][0]['mrp'];
                $quote['discountedPrice'] = $quote['items'][0]['discountedPrice'];
            }
        }
        return $quote;
    }
}
