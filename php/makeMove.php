<?php
	if (!$gameName = $_POST["id"]) return false;
	if (!$startCol = $_POST["startColumn"]) return false;
	if (!$startRow = $_POST["startRow"]) return false;
	if (!$endCol = $_POST["endColumn"]) return false;
	if (!$endRow = $_POST["endRow"]) return false;
	$promType = $_POST["promotionType"];
	if (!is_writable("../games/".$gameName)) return false;
	if (!$file = fopen("../games/".$gameName, "w+")) return false;
	if ($promType) {
		fwrite($file, $startCol.$startRow . " " . $endCol.$endRow . "=" . $promType);
	}
	fwrite($file, $startCol.$startRow . " " . $endCol.$endRow);
	fclose($file);
	echo $gameName;
?>