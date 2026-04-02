<?php
/**
 * 資料庫連接類 - 使用 MySQLi 進行資料庫操作
 */

require_once 'config.php';

class Database {
    private $connection;
    private static $instance;
    
    // 使用單例模式
    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->connect();
    }
    
    private function connect() {
        $this->connection = new mysqli(
            DB_HOST,
            DB_USER,
            DB_PASSWORD,
            DB_NAME,
            DB_PORT
        );
        
        // 檢查連接
        if ($this->connection->connect_error) {
            die('資料庫連接失敗: ' . $this->connection->connect_error);
        }
        
        // 設置字符集
        $this->connection->set_charset('utf8mb4');
    }
    
    // 獲取連接物件
    public function getConnection() {
        return $this->connection;
    }
    
    // 執行查詢
    public function query($sql) {
        $result = $this->connection->query($sql);
        if (!$result && DEBUG_MODE) {
            error_log('SQL 錯誤: ' . $this->connection->error . ' | SQL: ' . $sql);
        }
        return $result;
    }
    
    // 執行預備語句 (防止SQL注入)
    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }
    
    // 取得單筆記錄
    public function fetchOne($sql, $params = []) {
        $stmt = $this->connection->prepare($sql);
        if ($stmt === false) {
            error_log('Prepare 錯誤: ' . $this->connection->error);
            return null;
        }
        
        if (!empty($params)) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        
        return $row;
    }
    
    // 取得多筆記錄
    public function fetchAll($sql, $params = []) {
        $stmt = $this->connection->prepare($sql);
        if ($stmt === false) {
            error_log('Prepare 錯誤: ' . $this->connection->error);
            return [];
        }
        
        if (!empty($params)) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $stmt->close();
        
        return $rows;
    }
    
    // 插入資料
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
        
        $stmt = $this->connection->prepare($sql);
        if ($stmt === false) {
            error_log('Prepare 錯誤: ' . $this->connection->error);
            return false;
        }
        
        $types = str_repeat('s', count($data));
        $values = array_values($data);
        $stmt->bind_param($types, ...$values);
        
        $result = $stmt->execute();
        $insert_id = $this->connection->insert_id;
        $stmt->close();
        
        return $result ? $insert_id : false;
    }
    
    // 更新資料
    public function update($table, $data, $where, $where_params = []) {
        $set = implode(', ', array_map(function($k) { return "$k = ?"; }, array_keys($data)));
        $sql = "UPDATE $table SET $set WHERE $where";
        
        $stmt = $this->connection->prepare($sql);
        if ($stmt === false) {
            error_log('Prepare 錯誤: ' . $this->connection->error);
            return false;
        }
        
        $types = str_repeat('s', count($data) + count($where_params));
        $values = array_merge(array_values($data), $where_params);
        $stmt->bind_param($types, ...$values);
        
        $result = $stmt->execute();
        $stmt->close();
        
        return $result;
    }
    
    // 刪除資料
    public function delete($table, $where, $where_params = []) {
        $sql = "DELETE FROM $table WHERE $where";
        
        $stmt = $this->connection->prepare($sql);
        if ($stmt === false) {
            error_log('Prepare 錯誤: ' . $this->connection->error);
            return false;
        }
        
        if (!empty($where_params)) {
            $types = str_repeat('s', count($where_params));
            $stmt->bind_param($types, ...$where_params);
        }
        
        $result = $stmt->execute();
        $stmt->close();
        
        return $result;
    }
    
    // 開啟事務
    public function beginTransaction() {
        $this->connection->begin_transaction();
    }
    
    // 提交事務
    public function commit() {
        $this->connection->commit();
    }
    
    // 回滾事務
    public function rollback() {
        $this->connection->rollback();
    }
    
    // 獲取上次插入的ID
    public function getLastInsertId() {
        return $this->connection->insert_id;
    }
    
    // 關閉連接
    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// 使用全域函數方便調用
function db() {
    return Database::getInstance()->getConnection();
}

function dbQuery($sql) {
    return Database::getInstance()->query($sql);
}

function dbPrepare($sql) {
    return Database::getInstance()->prepare($sql);
}

function dbFetchOne($sql, $params = []) {
    return Database::getInstance()->fetchOne($sql, $params);
}

function dbFetchAll($sql, $params = []) {
    return Database::getInstance()->fetchAll($sql, $params);
}

function dbInsert($table, $data) {
    return Database::getInstance()->insert($table, $data);
}

function dbUpdate($table, $data, $where, $where_params = []) {
    return Database::getInstance()->update($table, $data, $where, $where_params);
}

function dbDelete($table, $where, $where_params = []) {
    return Database::getInstance()->delete($table, $where, $where_params);
}
