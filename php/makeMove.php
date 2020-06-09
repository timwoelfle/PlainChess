<?php
	if (!$gameName = $_POST["id"]) return false;
	if (!is_writable("../games/".$gameName)) return false;
	if ((!$startCol = $_POST["startColumn"]) || intval($startCol) < 1 || intval($startCol) > 8) return false;
	if ((!$startRow = $_POST["startRow"]) || intval($startRow) < 1 || intval($startRow) > 8) return false;
	if ((!$endCol = $_POST["endColumn"]) || intval($endCol) < 1 || intval($endCol) > 8) return false;
	if ((!$endRow = $_POST["endRow"]) || intval($endRow) < 1 || intval($endRow) > 8) return false;
	if (($promType = $_POST["promotionType"]) && strlen($promType) > 3) return false;
	$gameOver = $_POST["gameOver"];
	
	if (!$oldMoves = file_get_contents("../games/".$gameName, 0, NULL, 0, 100000)) return false;
	$newMove = $startCol . $startRow . " " . $endCol . $endRow;
	if ($promType) {
		$newMove .= "=" . $promType;
	}
	$newMove .= " " . date("d.m.Y H:i:s");
	file_put_contents("../games/".$gameName, $newMove . "\n" . $oldMoves);
	if ($gameOver) {
		copy("../games/".$gameName, "../games/finished/".$gameName);
	}
	
	echo $gameName;
?>