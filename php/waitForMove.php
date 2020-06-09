<?php
	if (!$gameName = $_POST["id"]) return false;
	if (!$line = file_get_contents("../games/".$gameName, 0, NULL, 0, 10)) return false;
	if (strpos($line, "=") === false) $line = substr($line, 0, 5);
	echo $line;
?>