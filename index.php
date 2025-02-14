<?php

include('inc/class/db.php');

// $player = new Players();
// $player->connectToDatabase();

$dbhost = 'localhost';
$dbuser = 'root';
$dbpass = 'root';
$dbname = 'local';

$db = new db($dbhost, $dbuser, $dbpass, $dbname);

$sql = "DESCRIBE `wee_weekly_stats`";

$result = $db->query($sql);

?>

<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Wee Weekly</title>
        <link rel="stylesheet" href="css/styles.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    </head>

    <body>
        <main class="main-wrapper">
            <section class="main-wrapper__inner">
                <h1>Wee Weekly</h1>
                <h2>Stats &amp; Draws Creation</h2>
                <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>

                <hr>

                <h3>Stats Table</h3>
            </section>
        </main>

        <footer>
            <p><strong>If you have any questions concerns, contact: <a href="mailto:blazin.media@gmail.com" title="Email Scott">Scott Turnbull</a></strong></p>
            <p>&copy; Copyright <?= date('Y'); ?></p>
        </footer>
    </body>
</html>