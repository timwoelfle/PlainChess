<?php
	if (!$gameName = $_POST["id"]) return false;
	if (strpos($gameName, "\\") !== false || strpos($gameName, ".") !== false || strpos($gameName, "*") !== false) return false;
	if (!fclose(fopen("../games/".$gameName, "x"))) return false;
	echo $gameName;
?>