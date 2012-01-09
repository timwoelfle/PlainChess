<?php
	if (!$gameName = $_POST["id"]) return false;
	if (!fclose(fopen("../games/".$gameName, "x"))) return false;
	echo $gameName;
?>