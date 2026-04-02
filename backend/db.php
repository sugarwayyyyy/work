<?php
// MySQLi 資料庫封裝，統一提供連線與常用查詢方法。

require_once 'config.php';

class Database {
    private $connection;
    private static $instance;
    
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
        
        if ($this->connection->connect_error) {
            die('資料庫連接失敗: ' . $this->connection->connect_error);
        }
        
        $this->connection->set_charset('utf8mb4');
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql) {
        $result = $this->connection->query($sql);
        if (!$result && DEBUG_MODE) {
            error_log('SQL 錯誤: ' . $this->connection->error . ' | SQL: ' . $sql);
        }
        return $result;
    }
    
    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }
    
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
    
    public function beginTransaction() {
        $this->connection->begin_transaction();
    }
    
    public function commit() {
        $this->connection->commit();
    }
    
    public function rollback() {
        $this->connection->rollback();
    }
    
    public function getLastInsertId() {
        return $this->connection->insert_id;
    }
    
    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// 保留全域 helper，讓舊代碼可直接呼叫。
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
