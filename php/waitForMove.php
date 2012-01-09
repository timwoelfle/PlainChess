<?php
	if (!$gameName = $_POST["id"]) return false;
	if (!$file = fopen("../games/".$gameName, "r")) return false;
	$line = fgets($file);
	fclose($file);
	echo $line;
?>