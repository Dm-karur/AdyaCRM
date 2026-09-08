<?php
namespace App\models;

class Attendance {
    private $conn;
    private $table_name = "attendances";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function findTodayByEmployee($employeeId, $date) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE employeeId = :employeeId AND date = :date LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':employeeId', $employeeId);
        $stmt->bindParam(':date', $date);
        $stmt->execute();
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    /**
     * Flexible create — accepts any subset of columns.
     * This fixes the bug where admin operations (manual attendance, mark leave, mark holiday)
     * tried to insert without providing all punchIn fields.
     */
    public function create($data) {
        $columns = [];
        $placeholders = [];
        
        foreach ($data as $key => $val) {
            $columns[] = "`$key`";
            $placeholders[] = ":$key";
        }
        
        $query = "INSERT INTO " . $this->table_name . " (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->conn->prepare($query);

        foreach ($data as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }

        return $stmt->execute();
    }

    /**
     * Update punch-out data with calculations
     */
    public function updatePunchOut($id, $data) {
        $query = "UPDATE " . $this->table_name . " 
                  SET punchOut_time=:punchOut_time, punchOut_photo=:punchOut_photo, 
                      punchOut_originalSelfie=:punchOut_originalSelfie, punchOut_attendanceImage=:punchOut_attendanceImage,
                      punchOut_latitude=:punchOut_latitude, punchOut_longitude=:punchOut_longitude, 
                      punchOut_accuracy=:punchOut_accuracy, punchOut_mapUrl=:punchOut_mapUrl, 
                      punchOut_address=:punchOut_address, punchOut_browser=:punchOut_browser, 
                      punchOut_os=:punchOut_os, punchOut_ip=:punchOut_ip, 
                      workingHours=:workingHours, lateMinutes=:lateMinutes, overtimeMinutes=:overtimeMinutes,
                      location_validation_status=:location_validation_status, attendance_distance=:attendance_distance
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        
        $stmt->bindValue(':id', $id);
        foreach ($data as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }

        return $stmt->execute();
    }

    /**
     * Generic flexible update — accepts any subset of columns.
     * Used by admin operations (manual attendance, mark leave, etc.)
     */
    public function updateFields($id, $data) {
        $fields = [];
        foreach ($data as $k => $v) {
            $fields[] = "`$k` = :$k";
        }
        
        $query = "UPDATE " . $this->table_name . " SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id);
        
        foreach ($data as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }
        
        return $stmt->execute();
    }

    /**
     * Get attendance records for an employee, sorted newest first
     */
    public function getMyAttendance($employeeId) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE employeeId = :employeeId ORDER BY date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':employeeId', $employeeId);
        $stmt->execute();
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Delete attendance records by date and status (for removing holidays)
     */
    public function deleteByDateAndStatus($date, $status) {
        $query = "DELETE FROM " . $this->table_name . " WHERE date = :date AND status = :status";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':date', $date);
        $stmt->bindParam(':status', $status);
        $stmt->execute();
        
        return $stmt->rowCount();
    }

    /**
     * Get a single attendance record by ID
     */
    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    /**
     * Format a flat DB row into the nested JSON structure the frontend expects.
     * Matches the Mongoose document shape returned by Node.js.
     */
    public static function formatForFrontend($record) {
        if (!$record) return null;
        
        return [
            '_id' => $record['id'],
            'employeeId' => $record['employeeId'],
            'employeeName' => $record['employeeName'] ?? null,
            'department' => $record['department'] ?? null,
            'date' => $record['date'],
            'status' => $record['status'],
            'isManualEntry' => (bool)($record['isManualEntry'] ?? false),
            'manualEntryReason' => $record['manualEntryReason'] ?? null,
            'isOfflineRecorded' => (bool)($record['isOfflineRecorded'] ?? false),
            'location_validation_status' => $record['location_validation_status'] ?? null,
            'attendance_distance' => isset($record['attendance_distance']) ? (float)$record['attendance_distance'] : null,
            'punchIn' => [
                'time' => $record['punchIn_time'] ?? null,
                'photo' => $record['punchIn_photo'] ?? null,
                'originalSelfie' => $record['punchIn_originalSelfie'] ?? null,
                'attendanceImage' => $record['punchIn_attendanceImage'] ?? null,
                'location' => [
                    'latitude' => $record['punchIn_latitude'] ?? null,
                    'longitude' => $record['punchIn_longitude'] ?? null,
                    'accuracy' => $record['punchIn_accuracy'] ?? null,
                    'mapUrl' => $record['punchIn_mapUrl'] ?? null,
                    'address' => $record['punchIn_address'] ?? null,
                ],
                'device' => [
                    'browser' => $record['punchIn_browser'] ?? null,
                    'os' => $record['punchIn_os'] ?? null,
                    'ip' => $record['punchIn_ip'] ?? null,
                ]
            ],
            'punchOut' => [
                'time' => $record['punchOut_time'] ?? null,
                'photo' => $record['punchOut_photo'] ?? null,
                'originalSelfie' => $record['punchOut_originalSelfie'] ?? null,
                'attendanceImage' => $record['punchOut_attendanceImage'] ?? null,
                'location' => [
                    'latitude' => $record['punchOut_latitude'] ?? null,
                    'longitude' => $record['punchOut_longitude'] ?? null,
                    'accuracy' => $record['punchOut_accuracy'] ?? null,
                    'mapUrl' => $record['punchOut_mapUrl'] ?? null,
                    'address' => $record['punchOut_address'] ?? null,
                ],
                'device' => [
                    'browser' => $record['punchOut_browser'] ?? null,
                    'os' => $record['punchOut_os'] ?? null,
                    'ip' => $record['punchOut_ip'] ?? null,
                ]
            ],
            'calculations' => [
                'workingHours' => (int)($record['workingHours'] ?? 0),
                'lateMinutes' => (int)($record['lateMinutes'] ?? 0),
                'overtimeMinutes' => (int)($record['overtimeMinutes'] ?? 0),
            ],
            'createdAt' => $record['created_at'] ?? null,
            'updatedAt' => $record['updated_at'] ?? null,
        ];
    }
}
