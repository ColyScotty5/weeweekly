<?php

class db {

    public $connection; // mysqli object
    public $query;
    public $show_errors = TRUE;

    public function __construct($dbhost = 'localhost', $dbuser = 'root', $dbpass = 'root', $dbname = 'local', $charset = 'utf8') {
        $this->connection = new mysqli($dbhost, $dbuser, $dbpass, $dbname);

        if ($this->connection->connect_error) {
            $this->error('Failed to connect to the database: ' . $this->connection->connect_error);
        }

		$this->connection->set_charset($charset);
    }

    public function query($query) {
        $result = $this->connection->execute_query($query);
    }

    public function error($error) {
        if ($this->show_errors) {
            exit($error);
        }
    }
}
