/*
 * PlainChess v1.0
 * http://plainchess.timwoelfle.de
 *
 * Copyright by Tim Wölfle (http://timwoelfle.de)
 * Licensed under the GPL Version 3 license (http://www.gnu.org/licenses/gpl-3.0.txt)
 *
 */

/*global $: false, localStorage: false */
/*jslint devel: true, browser: true, sloppy: true, white: true, plusplus: true, maxerr: 50, indent: 4 */

// ===========
// = Globals =
// ===========

var game, sync, menu, controller;

// ========
// = Game =
// ========

function Game(savedGame) {
	/*-- Private attributes & methods --*/
	
	// Game constants
	var pieceSymbols = {
		"♙": {color: "white", kind: "pawn"},
		"♘": {color: "white", kind: "knight"},
		"♗": {color: "white", kind: "bishop"},
		"♖": {color: "white", kind: "rook"},
		"♕": {color: "white", kind: "queen"},
		"♔": {color: "white", kind: "king"},
		"♟": {color: "black", kind: "pawn"},
		"♞": {color: "black", kind: "knight"},
		"♝": {color: "black", kind: "bishop"},
		"♜": {color: "black", kind: "rook"},
		"♛": {color: "black", kind: "queen"},
		"♚": {color: "black", kind: "king"}
	},
	
	// Game variables to be saved
	gameTime = 0, moves = [], gameState, whitesTurn = 1, castlingAllowed = {"white": {queenSide: true, kingSide: true}, "black": {queenSide: true, kingSide: true}},
	
	// Environment variables that can be recalculated in runtime
	field = {}, timerInterval, showCaptionInterval, gameOver, clickedPieceIsMoving;
	
	function generateNotationString(move) {
		var notationString;
		
		// Check for castling
		if ((pieceSymbols[move.pieceSymbol].kind === "king") && Math.abs(move.startColumn - move.endColumn) > 1) {
			return (move.endColumn === 3) ? "O-O-O" : "O-O";
		}
		
		// Normal start & target field string
		notationString  = (pieceSymbols[move.pieceSymbol].color === "white") ? move.pieceSymbol : '<span style="color: black">' + move.pieceSymbol + "</span>";
		notationString += String.fromCharCode(96 + move.startColumn);
		notationString += move.startRow;
		notationString += " ";
		
		if (move.capturedPieceSymbol) {
			notationString += (pieceSymbols[move.capturedPieceSymbol].color === "white") ? move.capturedPieceSymbol : '<span style="color: black">' + move.capturedPieceSymbol + "</span>";
		}
		
		notationString += String.fromCharCode(96 + move.endColumn);
		notationString += move.endRow;
		
		// Add suffix for promotion or en passant capturing
		if (move.promotionType) {
			notationString += "=";
			notationString += (pieceSymbols[move.pieceSymbol].color === "white") ? move.promotionType : '<span style="color: black">' + move.promotionType + "</span>";
		} else if (move.enPassant) {
			notationString += " e.p.";
		}
		
		// Add suffix for check or mate
		if (move.check && !move.mate) {
			notationString += "+";
		}
		if (move.mate || move.stalemate) {
			notationString += "#";
		}
		
		return notationString;
	}
	
	function updateInfoDrawer() {
		var lastMove = moves[moves.length - 1], currentTurnString = "", lastMoveString;
		
		// Current Turn
		if (lastMove && lastMove.stalemate) {
			currentTurnString = "Stalemate!";
		} else {
			if (lastMove && lastMove.mate) {
				currentTurnString = "Mate! ";
				if (sync) {
					currentTurnString += (whitesTurn === sync.playerIsWhite) ? "Opponent wins." : "You win.";
				} else {
					currentTurnString += (whitesTurn) ? "Black wins." : "White wins.";
				}
			} else {
				if (lastMove && lastMove.check) {
					currentTurnString = "Check! ";
				}
				if (sync) {
					currentTurnString += (whitesTurn === sync.playerIsWhite) ? "Your turn." : "Opponent's turn.";
				} else {
					currentTurnString += (whitesTurn) ? "White's turn." : "Black's turn.";
				}
			}
		}
		$("#currentTurn").html(currentTurnString);
		
		// Last Move
		if (moves.length) {
			lastMoveString = "Last move: " + generateNotationString(lastMove);
		} else {
			lastMoveString = "No move yet.";
		}
		$("#lastMove").html(lastMoveString);
	}
		
	function updateGameTime() {
		var h, min, string = "";
		
		gameTime++;
		h = Math.floor(gameTime / 60);
		min = gameTime % 60;
		string += (h<10) ? "0"+h : h;
		string += ":";
		string += (min<10) ? "0"+min : min;
		
		$("#gameTime").html(string);
	}
	
	function hidePromotionMenu() {
		// Fade promotion menu out and reset after animation
		$(".promotion").fadeOut(300, function () {
			$(".promotion > ul > li").unbind().remove();
			$(".promotion")[0].id = "";
			$(".promotion").css("left", "");
		});
	}
	
	function hideInfoDrawer() {
		if ($("#info").height() === 570) {
			$("#info").clearQueue().animate({"height": "540px"}, 100, "easeOutQuad");
		}
	}
	
	function showInfoDrawer() {
		if ($("#info").height() === 540) {
			$("#info").clearQueue().animate({"height": "570px"}, 100, "easeInQuad");
		}
	}
	
	function pieceObject(element, object) {
		return $(element).data("pieceObject", object);
	}
	
	function fieldObject(element, object) {
		return $(element).data("fieldObject", object);
	}
	
	function finishMove() {
		var possibleTurn;
		
		// Update turns
		whitesTurn = (whitesTurn) ? 0 : 1;
		
		// Check for check, mate and stalemate
		if (pieceObject($("td > .piece.king." + ((whitesTurn) ? "white" : "black"))).field.reachableBy[((whitesTurn) ? "black" : "white")].length) {
			moves[moves.length - 1].check = true;
		}
		$((whitesTurn) ? "td > .white" : "td> .black").each(function (index, piece) {
			if (pieceObject(piece).accessibleFields().length) {
				possibleTurn = true;
				
				// This is for performance reasons and makes sure, that the .each loop ends after the first possible turn found
				return false;
			}
		});
		if (!possibleTurn) {
			if (moves[moves.length - 1].check) {
				// Mate
				moves[moves.length - 1].mate = true;
				
				// Update end menu
				$("#end > .tone100 > h2 > span:first-child").css("background-position", (whitesTurn) ? "30% 100%" : "0 100%");
				$("#end > .tone100 > h2 > span:last-child").html((whitesTurn) ? "Black wins" : "White wins");
			} else {
				// Stalemate
				moves[moves.length - 1].stalemate = true;
				
				// Update end menu
				$("#end > .tone100 > h2 > span:first-child").css("background-position", "60% 100%");
				$("#end > .tone100 > h2 > span:last-child").html("Stalemate");
			}
			game.gameOver = true;
			clearInterval(timerInterval);
		}
		
		// Make king(s) blink if checked or the game ended
		if (moves[moves.length - 1].check) {
			if (moves[moves.length - 1].mate) {
				controller.blink($("td > .piece.king." + ((whitesTurn) ? "white" : "black")), 3, 1000, function () {
					if (!menu) {
						menu = new Menu("#end");
						menu.appear(true);
					}
				});
			} else {
				controller.blink($("td > .piece.king." + ((whitesTurn) ? "white" : "black")), 2, 1000);
			}
		} else if (moves[moves.length - 1].stalemate) {
			controller.blink($("td > .piece.king"), 3, 1000, function () {
				if (!menu) {
					menu = new Menu("#end");
					menu.appear(true);
				}
			});
		}
		
		// Update info drawer
		updateInfoDrawer();
		
		// Update local storage if autosave option is turned on
		if (controller.autoSave) {
			game.updateLocalStorage();
		}
		
		// Only send move to server if it's an online game and this turn wasn't received itself
		if (sync && sync.playerIsWhite !== whitesTurn) {
			sync.makeMove(moves[moves.length - 1]);
		}
	}
	
	function Piece(pieceElement) {
		// that has to be used instead of this in private functions, in timeout/interval functions and in for/each functions
		var that = this;
		
		pieceObject(pieceElement, this);
		
		this.element = pieceElement;
		
		this.symbol = pieceElement.innerHTML;
		
		this.kind = pieceSymbols[this.symbol].kind;
		
		this.color = pieceSymbols[this.symbol].color;
		
		this.isWhite = (this.color === "white") ? 1 : 0;
		
		this.field = fieldObject(pieceElement.parentNode);
		
		this.reachableFields = [];
		
		function removeCastlingRights() {
			if (that.kind === "king" || (that.kind === "rook" && that.field.column === 1)) {
				castlingAllowed[that.color].queenSide = false;
			}
			if (that.kind === "king" || (that.kind === "rook" && that.field.column === 8)) {
				castlingAllowed[that.color].kingSide = false;
			}
		}
		
		// TODO Maybe getReachableFields and updateReachables should be combined for reasons of clarity & structure
		this.getReachableFields = function () {
			// Datatype for field collections with the Array functionality as prototype
			function Fields(column, row) {
				this.add = function (columnDiff, rowDiff) {
					if (field[column + columnDiff] && field[column + columnDiff][row + rowDiff]) {
						return this.push(field[column + columnDiff][row + rowDiff]);
					}
					return false;
				};
			}
			Fields.prototype = [];
			
			var fields = new Fields(this.field.column, this.field.row), forward = (that.isWhite) ? +1 : -1, i;
			
			switch (this.kind) {
				case "pawn":
					fields.add(-1, forward);
					fields.add(+1, forward);
					break;
				case "knight":
					fields.add(-1, +2);
					fields.add(+1, +2);
					fields.add(-1, -2);
					fields.add(+1, -2);
					fields.add(-2, +1);
					fields.add(-2, -1);
					fields.add(+2, +1);
					fields.add(+2, -1);
					break;
				case "king":
					fields.add(-1, +1);
					fields.add(+0, +1);
					fields.add(+1, +1);
					fields.add(-1, +0);
					fields.add(+1, +0);
					fields.add(-1, -1);
					fields.add(+0, -1);
					fields.add(+1, -1);
					break;
				case "bishop": case "rook": case "queen":
					// Rook and queen
					if (this.kind !== "bishop") {
						$.each([[-1, 0], [+1, 0], [0, -1], [0, +1]], function (index, coords) {
							for (i = 1; fields.add(coords[0] * i, coords[1] * i); i++) {
								if (fields[fields.length - 1].piece) {
									break;
								}
							}
						});
					}
					// Bishop and queen
					if (this.kind !== "rook") {
						$.each([[-1, +1], [-1, -1], [+1, +1], [+1, -1]], function (index, coords) {
							for (i = 1; fields.add(coords[0] * i, coords[1] * i); i++) {
								if (fields[fields.length - 1].piece) {
									break;
								}
							}
						});
					}
					break;
			}
			
			return fields;
		};
		this.captureableFields = function () {
			var otherFields = this.reachableFields, fields = [];

			$.each(otherFields, function (index, otherField) {
				// If the target field is taken: only make it captureable when taken by the other color
				if (otherField.piece) {
					if (otherField.piece.isWhite !== that.isWhite) {
						fields.push(otherField);
					}
				// If it's not taken, always make it accessible, except for pawns 
				} else if (that.kind !== "pawn") {
					fields.push(otherField);
				}
			});

			return fields;
		};
		this.accessibleFields = function () {
			var fields = this.captureableFields(), forward = (that.isWhite) ? 1 : -1, homeRow = (that.isWhite) ? 1 : 8, cachedFields, king = pieceObject($("td > .piece.king." + ((whitesTurn) ? "white" : "black"))), aggressors = king.field.reachableBy[((this.isWhite) ? "black" : "white")], i, lineFld, behindPiece;
			
			switch (this.kind) {
				case "pawn":
					// One forward
					if (field[this.field.column][this.field.row + forward] && !field[this.field.column][this.field.row + forward].piece) {
						fields.push(field[this.field.column][this.field.row + forward]);
					}

					// Two forward in home line
					if (this.field.row === homeRow + forward && !field[this.field.column][this.field.row + forward].piece && !field[this.field.column][this.field.row + forward * 2].piece) {
						fields.push(field[this.field.column][this.field.row + forward * 2]);
					}

					// One diagonally in case of en passant
					if (this.field.row === homeRow + forward * 4 && moves.length && pieceSymbols[moves[moves.length - 1].pieceSymbol].kind === "pawn" && moves[moves.length - 1].endRow === this.field.row && Math.abs(moves[moves.length - 1].startRow - moves[moves.length - 1].endRow) === 2 && Math.abs(moves[moves.length - 1].startColumn - this.field.column) === 1) {
						fields.push(field[moves[moves.length - 1].startColumn][this.field.row + forward]);
					}
					break;
				case "king":
					// Check for castling
					if (castlingAllowed[this.color].queenSide && field[1][homeRow].piece && field[1][homeRow].piece.kind === "rook" && !field[2][homeRow].piece && !field[3][homeRow].piece && !field[4][homeRow].piece && !field[3][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length && !field[4][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length && !field[5][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length) {
						fields.push(field[3][homeRow]);
					}
					if (castlingAllowed[this.color].kingSide && field[8][homeRow].piece && field[8][homeRow].piece.kind === "rook" && !field[6][homeRow].piece && !field[7][homeRow].piece && !field[7][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length && !field[6][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length && !field[5][homeRow].reachableBy[((that.isWhite) ? "black" : "white")].length) {
						fields.push(field[7][homeRow]);
					}
					
					// Don't move on a dangerous field
					cachedFields = fields;
					fields = [];
					$.each(cachedFields, function (index, fld) {
						if (!fld.reachableBy[((that.isWhite) ? "black" : "white")].length) {
							// If king is checked: Make sure not to flee to fields that are not reachable by the enemy yet but would be after the king's move
							$.each(aggressors, function (index, aggressor) {
								if (!that.field.inBetween(aggressor.field, fld)) {
									// TODO FIXME When there are multiple aggressors and one would be able to reach fld after the move but the other wouldn't, an illegal move/fld is pushed
									fields.push(fld);
								}
							});
							if (!aggressors.length) {
								fields.push(fld);
							}
						}
					});
					return fields;
			}
			
			// If king is checked only certain moves are valid
			if (aggressors.length) {
				cachedFields = fields;
				fields = [];
				
				// Other pieces can't assist if king is threatened by two aggressors
				if (aggressors.length > 1) {
					return [];
				// If it's only one aggressor, check whether this piece can capture it or slip in between
				} else {
					$.each(cachedFields, function (index, fld) {
						if (aggressors[0].kind === "bishop" || aggressors[0].kind === "rook" || aggressors[0].kind === "queen") {
							if (fld.inBetween(king.field, aggressors[0].field)) {
								fields.push(fld);
							}
						}
						if (fld === aggressors[0].field) {
							fields.push(fld);
						}
					});
				}
			// If king isn't checked make sure he won't be after this move
			} else {				
				$.each([[-1, 0], [+1, 0], [0, -1], [0, +1], [-1, +1], [-1, -1], [+1, +1], [+1, -1]], function (index, coords) {
					// If piece is in one of the four outermost board fields, not all lines have to be checked
					if (!field[that.field.column + coords[0]] || !(lineFld = field[that.field.column + coords[0]][that.field.row + coords[1]])) {
						// return true; works in $.each as continue does in for
						return true;
					}
					
					
					// Is piece in between the currently described field and the king?
					if (that.field.inBetween(lineFld, king.field)) {
						// Check the whole line from king on
						for (i = 1; field[king.field.column + coords[0] * i] && (lineFld = field[king.field.column + coords[0] * i][king.field.row + coords[1] * i]); i++) {
							if (lineFld.piece) {
								// First for this piece
								if (lineFld.piece === that) {
									behindPiece = true;
									
									continue;
								// Secondly for possible aggressors
								} else if (behindPiece && lineFld.piece.isWhite !== that.isWhite && (lineFld.piece.kind === "queen" || (lineFld.piece.kind === "bishop" && index > 3) || (lineFld.piece.kind === "rook" && index < 4))) {
									
									// If this piece is protecting the king, make sure it stays in the line
									cachedFields = fields;
									fields = [];
									$.each(cachedFields, function (index, cachedFld) {
										if (cachedFld.inBetween(king.field, lineFld) || cachedFld === lineFld) {
											fields.push(cachedFld);
										}
									});
								}
								
								return false;
							}
						}
					}
				});
			}
			
			return fields;
		};
		
		this.updateReachables = function () {
			// Let old reachableFields forget about this piece
			$.each(this.reachableFields, function (index, fld) {
				index = fld.reachableBy[that.color].indexOf(that);
				if (index !== -1) {
					fld.reachableBy[that.color].splice(index, 1);
				}
			});
			
			// If already dead: stop here
			if (!this.field) {
				return false;
			}
			
			// Calculate new reachableFields
			this.reachableFields = this.getReachableFields();
			
			// Make new reachableFields know about this piece
			$.each(this.reachableFields, function (index, fld) {
				fld.reachableBy[that.color].push(that);
			});
		};
		
		this.moveToCemetery = function () {
			var target;
			
			// Remove castling rights if a tower was captured that didn't move yet
			if (this.kind === "rook") {
				removeCastlingRights();
			}
			
			// Move in DOM and animate
			target = $("<li />").appendTo($("#" + this.color + "Cemetery"));
			this.moveInDOM(target, true, true);
			
			// Remove draggability
			if ($(pieceElement).hasClass("ui-draggable")) {
				$(pieceElement).draggable("destroy");
			}
		};
		
		this.move = function (targetField, promotionType) {
			var capturedPiece, castling;

			// Update moves array
			moves.push({startColumn: that.field.column, startRow: that.field.row, endColumn: targetField.column, endRow: targetField.row, pieceSymbol: that.symbol});

			// Check for captured piece on end field
			capturedPiece = field[targetField.column][targetField.row].piece;

			// Check for captured piece en passant
			if (that.kind === "pawn" && that.field.column !== targetField.column && !capturedPiece) {
				capturedPiece = field[targetField.column][targetField.row + ((that.isWhite) ? -1 : 1)].piece;
				moves[moves.length - 1].enPassant = true;
			}

			// If there's a captured piece: move it to cemetery
			if (capturedPiece) {
				moves[moves.length - 1].capturedPieceSymbol = capturedPiece.symbol;
				capturedPiece.moveToCemetery();
			}
			
			// Check for castling
			// Don't check whether king's start position is correct, that is being taken care of by castlingAllowed
			// Make sure it's a king that was moved in its home row and that it's a castling move that's allowed
			if (((that.symbol === "♔" && targetField.row === 1) || (that.symbol === "♚" && targetField.row === 8)) && ((targetField.column === 3 && castlingAllowed[that.color].queenSide) || (targetField.column === 7 && castlingAllowed[that.color].kingSide))) {
				castling = {};
				castling.row = (that.symbol === "♔") ? 1 : 8;
				castling.startColumn = (targetField.column === 3) ? 1 : 8;
				castling.endColumn = (targetField.column === 3) ? 4 : 6;

				castling.tower = field[castling.startColumn][castling.row].piece;
				
				// Move in DOM and animate
				castling.tower.moveInDOM(field[castling.endColumn][castling.row].element, true);
			}

			// Make sure to update castlingAllowed when towers or kings are moved
			if (that.kind === "rook" || that.kind === "king") {
				removeCastlingRights();
			}
			
			// Move in DOM
			that.moveInDOM(targetField.element);
			
			// Check for pawn promotion: if one was received in an online game, don't show the menu
			if ((that.symbol === "♙" && targetField.row === 8) || (that.symbol === "♟" && targetField.row === 1)) {
				return that.promote(promotionType);
			}
			
			// Update gameState and save it in localStorage
			finishMove();
		};
		
		this.animateMove = function (targetField, promotionType) {
			$(pieceElement).css("position", "relative").animate({
				"left": $(targetField.element).offset().left - $(this.field.element).offset().left,
				"top": $(targetField.element).offset().top - $(this.field.element).offset().top
			}, 1000, "easeInOutQuad", function () {
				if (clickedPieceIsMoving) {
					clickedPieceIsMoving = false;
				}
				that.move(targetField, promotionType);
			});
		};
		
		this.startDragging = function () {
			var fields;
			
			// Unselect piece if one was clicked on
			$("#board td").removeClass("acceptable").unbind("click");
			
			// If it's not the player's turn or the game is over or a promotion is happening, dragging is not allowed
			if (whitesTurn !== this.isWhite || clickedPieceIsMoving || (moves[moves.length -1] && (moves[moves.length -1].mate || moves[moves.length -1].stalemate)) || $(".promotion").is(":visible")) {
				return false;
			}

			// Reset droppable options to remove last turn's accessible flags
			$("#board td").droppable("option", "accept", "");

			// Mark fields that are accessible
			fields = this.accessibleFields();
			$.each(fields, function (index, fld) {
				$(fld.element).droppable("option", "accept", ".piece");
			});
			
			return true;
		};
		
		this.clickPiece = function () {
			// If it's not the player's turn or the game is over or a promotion is happening, clicking is not allowed
			if (whitesTurn !== this.isWhite || clickedPieceIsMoving || (moves[moves.length -1] && (moves[moves.length -1].mate || moves[moves.length -1].stalemate)) || $(".promotion").is(":visible")) {
				return true;
			}
			
			function unselect() {
				$("#board td").removeClass("acceptable").unbind("click");
			}
			
			// Reset
			unselect();
			
			$("#board td").click(function () {
				unselect();
			});
			
			// Show fields that are accessible
			$.each(this.accessibleFields(), function (index, fld) {
				$(fld.element).addClass("acceptable");
				
				$(fld.element).click(function () {
					clickedPieceIsMoving = true;
					unselect();
					that.animateMove(fld);
				});
			});
			
			// Makes sure only one click event is called, and not one for piece and one for field
			return false;
		};
		
		this.promote = function (pieceSymbol) {
			// If a pieceSymbol is passed: promote & finish move!
			if (pieceSymbol) {
				// Promote pawn, update everything, finish move and hide menu
				that.symbol = pieceElement.innerHTML = pieceSymbol;
				that.kind = pieceSymbols[pieceSymbol].kind;
				moves[moves.length - 1].promotionType = pieceSymbol;
				gameState[moves[moves.length - 1].endColumn][moves[moves.length - 1].endRow] = pieceSymbol;
				that.updateReachables();
				finishMove();
				hidePromotionMenu();
				
				// Animate promotion
				controller.flip(pieceElement, "horizontal", 1000, function () {
					$(pieceElement).removeClass("pawn");
					$(pieceElement).addClass(that.kind);
				});
			// Otherwise: show promotion menu
			} else {
				var mirroredBoardOrientation;

				// Add menu items for possible pieces
				$.each(this.isWhite ? ["♘", "♗", "♖", "♕"] : ["♞", "♝", "♜", "♛"], function (index, pieceSymbol) {
					// Convert piece when menu item is clicked
					$('<li><div class="piece ' + pieceSymbols[pieceSymbol].color + ' ' + pieceSymbols[pieceSymbol].kind + '">' + pieceSymbol + '</div></li>').appendTo($(".promotion > ul")).click(function () {
						that.promote(pieceSymbol);
					});
				});

				// Position and show menu
				mirroredBoardOrientation = (sync) ? !sync.playerIsWhite : 0;
				$(".promotion")[0].id = (this.isWhite || mirroredBoardOrientation) ? "top" : "bottom";
				$(".promotion").css("left", -130 + 60 * Math.abs(this.field.column - 9 * mirroredBoardOrientation) + "px");
				$(".promotion").fadeIn(300);
			}
		};
		
		this.moveInDOM = function (target, animated, spin) {
			var oldFieldsReachables, oldPosLeft, oldPosTop;
			
			// Cache old field's reachables
			oldFieldsReachables = this.field.reachableBy.white.concat(this.field.reachableBy.black);
			
			// Update start field
			gameState[this.field.column][this.field.row] = "";
			this.field.piece = undefined;
			this.field = undefined;
			
			// Update reachables for old field's neighbours
			// This not only happens for moved pieces but also for dead ones, which might seem unnecessary: they are already updated via newField.reachableBy, aren't they? In most cases yes, but not in en passant capturing
			$.each(oldFieldsReachables, function (index, piece) {
				if (piece.kind === "bishop" || piece.kind === "rook" || piece.kind === "queen") {
					piece.updateReachables();
				}
			});
			
			// Save old position for animation
			if (animated) {
				oldPosLeft = $(pieceElement).offset().left;
				oldPosTop = $(pieceElement).offset().top;
			}
			
			// Move in DOM tree
			$(target).append(pieceElement);
			
			// Animate move
			if (animated) {
				if (spin) {
					controller.spin(pieceElement, 1000);
				}
				
				$(pieceElement).css({
					"position": "relative",
					"left": oldPosLeft - $(pieceElement).offset().left + "px",
					"top": oldPosTop - $(pieceElement).offset().top + "px"
				}).animate({"left": "0", "top": "0"}, 1000, "easeInOutQuad");
			} else {
				$(pieceElement).css({"left": "0", "top": "0"});
			}
			
			// Update target field if not moved to cemetery
			if (fieldObject(target)) {				
				gameState[fieldObject(target).column][fieldObject(target).row] = this.symbol;
				this.field = fieldObject(target);
				this.field.piece = this;
				
				// TODO PERFORMANCE Investigate whether there is a simple method to not update several pieces twice
				// Update reachables
				$.each(this.field.reachableBy.white.concat(this.field.reachableBy.black), function (index, piece) {
					if (piece.kind === "bishop" || piece.kind === "rook" || piece.kind === "queen") {
						piece.updateReachables();
					}
				});
			}
			this.updateReachables();
		};
	}
	
	function Field(fieldElement) {
		fieldObject(fieldElement, this);
		
		this.element = fieldElement;
		
		this.column = parseInt(fieldElement.id.substr(0, 1), 10);
		this.row = parseInt(fieldElement.id.substr(1, 1), 10);
		
		this.piece = (fieldElement.firstChild) ? pieceObject(fieldElement.firstChild) : undefined;
		
		this.reachableBy = {white: [], black: []};
		
		this.createPiece = function (pieceSymbol) {
			this.piece = new Piece($('<div class="piece ' + pieceSymbols[pieceSymbol].color + ' ' + pieceSymbols[pieceSymbol].kind + '">' + pieceSymbol + '</div>').appendTo(fieldElement)[0]);
		};
		
		this.inBetween = function (startField, endField) {
			// Vertically
			if (startField.column === endField.column && this.column === startField.column) {
				return (this.row < startField.row && this.row > endField.row) || (this.row > startField.row && this.row < endField.row);
			// Horizontally
			} else if (startField.row === endField.row && this.row === startField.row) {
				return (this.column < startField.column && this.column > endField.column) || (this.column > startField.column && this.column < endField.column);
			// Diagonally
			} else if (Math.abs(startField.column - endField.column) === Math.abs(startField.row - endField.row)) {
				return Math.abs(startField.column - this.column) === Math.abs(startField.row - this.row) && Math.abs(startField.column - this.column) < Math.abs(startField.column - endField.column) && Math.abs(endField.column - this.column) < Math.abs(startField.column - endField.column) && Math.abs(startField.row - this.row) < Math.abs(startField.row - endField.row) && Math.abs(endField.row - this.row) < Math.abs(startField.row - endField.row);
			}
			
			return false;
		};
	}
	
	(function init() {
		var boardOrientation, row, column;

		/* Introduce field object and create caption */
		boardOrientation = (sync) ? sync.playerIsWhite : 1;
		$("#board td").each(function (index, element) {
			row = Math.abs(Math.floor(index / 8) - 7 * boardOrientation) + 1;
			column = Math.abs(index % 8 - 7 * Math.abs(boardOrientation - 1)) + 1;
			
			element.setAttribute("id", column + "" + row);
			field[column] = field[column] || {};
			field[column][row] = new Field(element);
		});
		$("th").each(function (index, element) {
			// The first 8 th tags get the vertical captions and the last 8 the horizontal ones
			element.innerHTML = (index < 8) ? Math.abs(index - 7 * boardOrientation) + 1 : String.fromCharCode(96 + Math.abs(index - 8 - 7 * Math.abs(boardOrientation - 1)) + 1);
		});
		
		// If saved game found, load that!
		if (savedGame) {
			whitesTurn = savedGame.whitesTurn;
			gameState = savedGame.gameState;
			castlingAllowed = savedGame.castlingAllowed;
			gameTime = savedGame.gameTime;
			moves = savedGame.moves;
			
			// Find capturedPieceSymbols in moves
			$.each(moves, function (index, move) {
				if (move.capturedPieceSymbol) {
					$('<li><div class="piece ' + pieceSymbols[move.capturedPieceSymbol].color + ' ' + pieceSymbols[move.capturedPieceSymbol].kind + '">' + move.capturedPieceSymbol + '</div></li>').appendTo($("#" + pieceSymbols[move.capturedPieceSymbol].color + "Cemetery"));
				}
			});
			
			// TODO REDUNDANCY Update end menu code is used twice (see game.finishMove)
			// If a finished game is loaded, notice that and update end menu
			if (moves.length && (moves[moves.length -1].mate || moves[moves.length -1].stalemate)) {
				gameOver = true;
				if (moves[moves.length -1].mate) {
					$("#end > .tone100 > h2 > span:first-child").css("background-position", (whitesTurn) ? "30% 100%" : "0 100%");
					$("#end > .tone100 > h2 > span:last-child").html((whitesTurn) ? "Black wins" : "White wins");
				} else {
					$("#end > .tone100 > h2 > span:first-child").css("background-position", "60% 100%");
					$("#end > .tone100 > h2 > span:last-child").html("Stalemate");
				}
			}
		}
		
		// Place pieces
		gameState = gameState || {1: {1: "♖", 2: "♙", 7: "♟", 8: "♜"}, 2: {1: "♘", 2: "♙", 7: "♟", 8: "♞"}, 3: {1: "♗", 2: "♙", 7: "♟", 8: "♝"}, 4: {1: "♕", 2: "♙", 7: "♟", 8: "♛"}, 5: {1: "♔", 2: "♙", 7: "♟", 8: "♚"}, 6: {1: "♗", 2: "♙", 7: "♟", 8: "♝"}, 7: {1: "♘", 2: "♙", 7: "♟", 8: "♞"}, 8: {1: "♖", 2: "♙", 7: "♟", 8: "♜"}};
		$.each(field, function (columnIndex, column) {
			$.each(column, function (rowIndex, fld) {
				if (gameState[columnIndex] && gameState[columnIndex][rowIndex]) {
					field[columnIndex][rowIndex].createPiece(gameState[columnIndex][rowIndex]);
				}
			});
		});
		
		// Calculate first set of reachableFields
		$("td > .piece").each(function (index, piece) {
			pieceObject(piece).updateReachables();
		});
		
		// Mirror the first knight of each color
		$("td > .white.knight:first, td > .black.knight:first").css("-moz-transform", "scaleX(-1)");
		$("td > .white.knight:first, td > .black.knight:first").css("-webkit-transform", "scaleX(-1)");
		$("td > .white.knight:first, td > .black.knight:first").css("-o-transform", "scaleX(-1)");
		$("td > .white.knight:first, td > .black.knight:first").css("-ms-transform", "scaleX(-1)");
		
		/* Piece draggability */
		$("td > .piece").each(function (index, element) {
			// Only make piece draggable if it's an offline game or the piece color matches the online player's color
			if (!sync || sync.playerIsWhite === pieceObject(element).isWhite) {
				// Pieces: stay in the table and go back to origin when not dropped on a valid field
				$(element).draggable({containment: $("#board"), revert: "invalid",
					// Call a function before actually dragged
					start: function (event, ui) {
						return pieceObject(ui.helper[0]).startDragging();
					}
				});
				
				$(element).click(function () {
					return pieceObject(this).clickPiece();
				});
			}
		});

		/* Field droppability */
		$("#board td").droppable({addClasses: false, accept: "", activeClass: "acceptable",
			// Fields: call a function when a piece is dropped on
			drop: function (event, ui) {
				return pieceObject(ui.draggable[0]).move(fieldObject(this));
			}
		});
		
		/* Info drawer & field captions */
		$("#border").hover(
			function () {
				if (!menu) {
					showCaptionInterval = setTimeout(function () { $("#border table").fadeIn(300); }, 500);
				}
			},
			function () {
				$("#border table").fadeOut(300);
				clearInterval(showCaptionInterval);
			}
		);
		updateInfoDrawer();
		updateGameTime();
		showInfoDrawer();
		if (!gameOver) {
			timerInterval = setInterval(function () { updateGameTime(); }, 1000);
		}
	}());
	
	/*-- Public attributes & privileged methods --*/
	
	return {
		gameOver: gameOver,
		
		deinit: function () {
			// Remove locally saved game (and sync information)
			localStorage.clear();
			
			// Resave autoSave option
			if (!controller.autoSave) {
				localStorage.noAutoSave = true;
			}
			
			// Quit promotion if one is happening right now
			hidePromotionMenu();

			// Remove all pieces and draggability / droppability functionality
			$(".piece").fadeOut(300, function () {
				// In case of dead pieces: remove their parent containers too
				$(this).parent("li").remove();
				$(this).remove();
			});
			$(".ui-draggable").draggable("destroy");
			$("#board td").droppable("destroy");

			// Remove game timer and hide info drawer
			clearInterval(timerInterval);
			hideInfoDrawer();
			$("#border").unbind();
		},

		fieldIsTaken: function (column, row) { // TODO This function is only for sync.waitForMove() and it'll become obsolete with better server side turn recognition
			if (field[column] && field[column][row] && field[column][row].piece) {
				return true;
			}
			return false;
		},
		
		receiveCoordinates: function (startColumn, startRow, endColumn, endRow, promotionType, preanimation) {
			var startField, targetField, piece, validMove;

			startField = document.getElementById(startColumn + "" + startRow);
			targetField = document.getElementById(endColumn + "" + endRow);
			piece = startField.firstChild;

			/* Make sure the received move is valid because of possible desync (most likely due to cheating) */

			if (!startField || !targetField || !piece) {
				return false;
			}

			// Walk through all accessible coordinates for the moved piece
			$.each(pieceObject(piece).accessibleFields(), function (index, fld) {
				if (fieldObject(targetField) === fld) {
					validMove = true;
				}
			});

			/* Move piece and report success / deync */
			
			// If window was inactive since last move, make piece blink twice for the player to gain orientation again
			if (preanimation) {
				controller.blink(piece, 2, 1000, function () {
					pieceObject(piece).animateMove(fieldObject(targetField), promotionType);
				});
			} else {
				pieceObject(piece).animateMove(fieldObject(targetField), promotionType);
			}

			return (validMove) ? true : false;
		},
		
		updateLocalStorage: function () {
			localStorage.whitesTurn = whitesTurn;
			localStorage.gameState = JSON.stringify(gameState);
			localStorage.castlingAllowed = JSON.stringify(castlingAllowed);
			localStorage.gameTime = gameTime;
			localStorage.moves = JSON.stringify(moves);
		}
	};
}

// ========
// = Sync =
// ========

function Sync() {
	/*-- Private attributes & methods --*/
	
	var gameName, syncInterval, windowHasFocus = 1;
	
	function toggleTitleNotification() {
		document.title = (document.title === "PlainChess" && !windowHasFocus) ? "Your turn!" : "PlainChess";
		if (!windowHasFocus) {
			setTimeout(function() { toggleTitleNotification(); }, 1000);
		}
	}
	
	(function init() {
		// Notice when window is focused or blurred
		$(window).focus(function () {
			windowHasFocus = 1;
		});
		$(window).blur(function () {
			windowHasFocus = 0;
		});
	}());
	
	/*-- Public attributes & privileged methods --*/
	
	return {
		playerIsWhite: 1,

		deinit: function () {
			clearInterval(syncInterval);
			$(window).unbind();
		},

		hostGame: function (name) {
			$.post("php/hostGame.php", { "id": name }, function (data) {
				if (!data) {
					menu.error(document.getElementById("hostGameName"), "Name already taken…");
				} else {
					gameName = data;
					$("#hostGame > input[type='button']")[0].value = "";
					$("#hostGame > input[type='button']").css("background", "#5a4232 url(img/ajax-loader.gif) center no-repeat");
					$("input[type='text']").attr("readonly", "readonly");
					$("input[type='button']").attr("disabled", "disabled");
					menu.deinit();
					syncInterval = setInterval(function () { sync.waitForStart(); }, 5000);

					localStorage.gameName = gameName;
					localStorage.playerIsWhite = sync.playerIsWhite;
				}
			});
		},

		joinGame: function (name) {
			$.post("php/joinGame.php", { "id": name }, function (data) {
				if (!data) {
					menu.error(document.getElementById("joinGameName"), "Game not hosted…");
				} else {
					sync.playerIsWhite = 0;
					gameName = data;
					game = new Game();
					menu.disappear(true);
					syncInterval = setInterval(function () { sync.waitForMove(); }, 5000);
					
					localStorage.gameName = gameName;
					localStorage.playerIsWhite = sync.playerIsWhite;
				}
			});
		},

		resumeGame: function () {
			if (!localStorage.gameName || !localStorage.playerIsWhite) {
				return false;
			}
			gameName = localStorage.gameName;
			sync.playerIsWhite = parseInt(localStorage.playerIsWhite, 10);
			if (localStorage.whitesTurn != sync.playerIsWhite) {
				syncInterval = setInterval(function () { sync.waitForMove(); }, 5000);
			}
		},

		waitForStart: function () {
			$.post("php/waitForStart.php", { "id": gameName }, function (data) {
				if (data === "joined") {
					toggleTitleNotification();
					menu.disappear(true);
					game = new Game();
					clearInterval(syncInterval);
				}
			});
		},

		waitForMove: function () {
			var startColumn, startRow, endColumn, endRow, promotionType;
			
			function passMove(preanimation) {
				if (!game.receiveCoordinates(startColumn, startRow, endColumn, endRow, promotionType, preanimation)) {
					alert("Invalid move received, maybe due to cheating. Games might be out of sync, restart is recommended.");
				}
			}
			
			$.post("php/waitForMove.php", { "id": gameName }, function (data) {
				if (data !== "joined") {
					startColumn = parseInt(data.substr(0, 1), 10);
					startRow = parseInt(data.substr(1, 1), 10);
					endColumn = parseInt(data.substr(3, 1), 10);
					endRow = parseInt(data.substr(4, 1), 10);
					if (data.substr(6, 1)) {
						promotionType = data.substr(6, 1);
					}

					if (game.fieldIsTaken(startColumn, startRow)) {
						clearInterval(syncInterval);

						// TODO Shown menus, esp. Resume menus after reload should count as inactive. Right now if you open the site/app and there is a new move it is done behind the menu and doesn't get noticed.
						// Move piece right away if window is active
						if (windowHasFocus) {
							passMove(0);
						} else {
							// Otherwise use blinking title notification to make user aware of the move
							toggleTitleNotification();

							// Do not animate the move until the window is active again
							$(window).focus(function () {
								windowHasFocus = 1;

								passMove(1);

								// Make sure the move won't be repeated every time the window is focused, reset focus event
								$(window).unbind("focus");
								$(window).focus(function () {
									windowHasFocus = 1;
								});
							});
						}

					}
				}
			});
		},

		makeMove: function (move) {
			$.post("php/makeMove.php", { "id": gameName, "startColumn": move.startColumn, "startRow": move.startRow, "endColumn": move.endColumn, "endRow": move.endRow, "promotionType": move.promotionType }, function (data) {
				if (!data) {
					alert("Error occured during sync! Game might have ended!");
				} else {
					syncInterval = setInterval(function () { sync.waitForMove(); }, 5000);
				}
			});
		}
	};
}

// ========
// = Menu =
// ========

function Menu(name) {
	/*-- Private attributes & methods --*/
	
	var menuBox, stripes, textFields, buttons, quickOptions, locked;
	
	menuBox = $(name);
	stripes = menuBox.children();
	textFields = stripes.children("input[type='text']");
	buttons = stripes.children("input[type='button']");
	quickOptions = stripes.children("h2").children("a");
	locked = 0;
	
	function highlightStripe(number) {
		if (locked) {
			return false;
		}
		stripes.each(function (index, element) {
			$(element).children().clearQueue();
			if (number === index + 1 || !number) {
				$(element).children().fadeTo(300, 1);
			} else {
				$(element).children().fadeTo(300, 0.3);
			}
		});
	}
	
	function init() {
		var code;
		
		// Behaviour for menu options
		// Remove option highlight when cursor exits menu
		menuBox.mouseleave(function (handler) {
			highlightStripe(0);
		});
		stripes.each(function (index, element) {
			// Highlight options on mouseenter (jQuery alternative to mouseover that doesn't refire on entering child elements) and also focus input fields when clicked
			if (element.id) {
				$(element).mouseenter(function () {
					highlightStripe(index + 1);
				});
				$(element).click(function () {
					$(element).children("input[type='text']").focus();
					// Necessary when clicking on a quickLink stripe while an other's child is focused
					highlightStripe(index + 1);
				});
			// Remove option highlight when an empty stripe is hovered or clicked
			} else {
				$(element).mouseenter(function () {
					highlightStripe(0);
				});
			}
			
			// Higlight option when a child object is focused and remove highlight when focus blurs
			$(element).children().each(function (childIndex, childElement) {
				$(childElement).focus(function () {
					highlightStripe(index + 1);
					locked = 1;
				});
				
				$(childElement).blur(function () {
					locked = 0;
					highlightStripe(0);
				});
			});
		});
		
		// Behaviour for text fields
		textFields.each(function (index, element) {
			// Focus
			$(element).focus(function () {
				if (element.value === element.getAttribute("value")) {
					element.value = "";
				}
			});
			// Blur
			$(element).blur(function () {
				if (element.value === "" || $(element).hasClass("error")) {
					element.value = element.getAttribute("value");
					$(element).removeClass("error");
				}
			});
			
			// Keypress: when Enter is hit, call the option's function
			$(element).keypress(function (key) {
				code = (key.keyCode) ? key.keyCode : key.which;
				if (code !== 13) {
					// When an error message is shown and another key than Enter is hit, remove error message
					if ($(element).hasClass("error")) {
						element.value = "";
						$(element).removeClass("error");
						return true;
					}
					return true;
				}
				menu.menuOption(element.parentNode.id);
			});
		});
		
		// Behaviour for buttons: when clicked, call the option's function
		buttons.each(function (index, element) {
			$(element).click(function () { menu.menuOption(element.parentNode.id); });
		});
		
		// Behaviour for links: when clicked, call the option's function
		quickOptions.each(function (index, element) {
			$(element).click(function () {
				menu.menuOption(element.parentNode.parentNode.id);
				return false;
			});
		});
		
		// Tag initialization
		menu.initialized = true;
	}
	
	/*-- Public attributes & privileged methods --*/
	
	return {
		name: name,
		
		initialized: false,
		
		deinit: function () {
			// Remove all mouse and key events set in init()
			menuBox.unbind();
			$(stripes).unbind();
			$(stripes).children().unbind();
			$(quickOptions).unbind();
		},
		
		appear: function (animated) {
			menuBox.show();
			if (animated) {
				stripes.each(function (index, element) {
					$(element).css("left", "-480px").animate({"left": "0"}, 500 + index * 100, "easeOutQuad", function () {
						// When last stripe stops moving (the last one takes the longest), init menu
						if (index === stripes.length - 1) {
							init();
						}
					});
				});
			} else {
				init();
			}
		},

		disappear: function (animated) {
			menu.deinit();
			
			function deinitAfterAnimation() {
				menuBox.hide();
				
				// Reset global variable
				if (menu) {
					menu = undefined;
				}
				
				// Reset DOM
				$("input[type='text']")[0].value = $("input[type='text']")[0].getAttribute("value");
				
				// Reset host game option
				$("#hostGame > input[type='button']")[0].value = "Go";
				$("#hostGame > input[type='button']").css("background", "");
				$("input[type='text']").attr("readonly", "");
				$("input[type='button']").attr("disabled", "");
			}
			
			if (animated) {
				stripes.each(function (index, element) {
					$(element).animate({"left": "480px"}, 400 + 100 * (stripes.length - index), "easeInQuad", function () {
						// When last stripe (the first one takes the longest) is gone, hide menu
						if (!index) {
							deinitAfterAnimation();
						}
					});
				});
			} else {
				deinitAfterAnimation();
			}
			
			// Tag deinitialization
			if (menu) {
				menu.initialized = false;
			}
		},

		error: function (input, msg) {
			input.value = msg;
			$(input).addClass("error").focus().caret(0,0);
		},

		/*-- Menu options --*/

		menuOption: function (optionId) {
			var name;
			
			switch (optionId) {
				case "hostGame":
					name = document.getElementById("hostGameName").value.trim();
					if (!name || name === "Host game named…" || name === "Enter game name…" || name === "Name already taken…") {
						return menu.error(document.getElementById("hostGameName"), "Enter game name…");
					}
					sync = new Sync();
					sync.hostGame(name);
					break;

				case "joinGame":
					name = document.getElementById("joinGameName").value.trim();
					if (!name || name === "Join game named…" || name === "Enter game name…" || name === "Game not hosted…") {
						return menu.error(document.getElementById("joinGameName"), "Enter game name…");
					}
					sync = new Sync();
					sync.joinGame(name);
					break;

				case "playOffline":
					game = new Game();
					menu.disappear(true);
					break;

				case "toggleAutoSave":
					// Only in offline games
					if (sync) {
						break;
					}
					
					// Set option
					controller.autoSave = (controller.autoSave) ? false : true;
					
					// Save option
					if (controller.autoSave) {
						delete localStorage.noAutoSave;
						game.updateLocalStorage();
					} else {
						localStorage.noAutoSave = true;
					}
					
					// Adjust menu
					$("#toggleAutoSave > h2 > a > span:last-child").html((controller.autoSave) ? "on" : "off");
					controller.flip($("#pause > .tone55 > h2 span:first-child"), "horizontal", 250, function () {
						$("#pause > .tone55 > h2 span:first-child").css("background-position", (controller.autoSave) ? "60% 57.14%" : "100% 85.71%");
					});
					break;

				case "playOn":
					menu.disappear(true);
					break;

				case "quitGame":
					game = game.deinit();
					if (sync) {
						sync = sync.deinit();
					}
					menu = menu.disappear();
					menu = new Menu("#start");
					menu.appear(true);
					break;
			}
		}
	};
}

// ==============
// = Controller =
// ==============

controller = (function () {
	/*-- Private attributes & methods --*/
	
	function toggleMenu(animated) {
		if ($("#toggleFaq").hasClass("active")) {
			$("#toggleFaq").click();
			return false;
		}
		
		if (menu) {
			if (menu.name !== "#start" && menu.initialized) {
				menu.disappear(animated);
			}
		} else {
			menu = new Menu((game.gameOver) ? "#end" : "#pause");
			menu.appear(animated);
		}
	}
	
	(function init() {
		var savedGame;
		
		// If a saved gameState or gameName or both is found, resume
		if (localStorage.gameState || localStorage.gameName) {
			if (localStorage.gameState) {
				savedGame = {};
				savedGame.whitesTurn = parseInt(localStorage.whitesTurn, 10);
				savedGame.gameTime = parseInt(localStorage.gameTime, 10);
				
				// In the case that localStorage contains old or modified data that can't be parsed simply clear localStorage
				try {
					savedGame.gameState = JSON.parse(localStorage.gameState);
					savedGame.castlingAllowed = JSON.parse(localStorage.castlingAllowed);
					savedGame.moves = JSON.parse(localStorage.moves);
				} catch (error) {
					localStorage.clear();
					delete savedGame;
				}
			}
			
			if (localStorage.gameName) {
				sync = new Sync();
				sync.resumeGame();
			}
			
			game = new Game(savedGame);
			
			toggleMenu(false);
		
		// If nothing saved is found, show start menu
		} else {
			menu = new Menu("#start");
			menu.appear();
		}
		
		// Initialize showing/hiding of pause menu when clicking on the logo or pressing Esc
		$("h1 a").click(function () {
			toggleMenu(true);
			return false;
		});
		$(document).keypress(function (key) {
			if (key.keyCode === 27 || key.which === 27) {
				toggleMenu(true);
				return false;
			}
		});
		
		// Initialize header menu
		$("#toggleFaq").click(function () {
			$("#toggleFaq").toggleClass("active");
			$("#flip").toggleClass("flipped");
			return false;
		});
		
		$("#contact").click(function () {
			$("#contact").unbind();
			controller.flip($("#contact"), "vertical", 250, function () {
				$("#contact").html("tim.woelfle@web.de");
				$("#contact").attr("href", "mailto:tim.woelfle@web.de?subject=PlainChess");
			});
			return false;
		});
		
		// If autoSave option is turned off, adjust pause menu
		if (localStorage.noAutoSave && !sync) {
			// TODO REDUNDANCY Adjust menu code is used twice (see menu.menuOption.toggleAutoSave)
			// Adjust menu
			$("#toggleAutoSave > h2 > a > span:last-child").html("off");
			$("#pause > .tone55 > h2 span:first-child").css("background-position", "100% 85.71%");
		}
	}());
	
	/*-- Public attributes & privileged methods --*/
	
	return {
		autoSave: (localStorage.noAutoSave && !sync) ? false : true,
		
		blink: function (element, count, durationEach, callback) {
			$(element).animate({"opacity": "0"}, durationEach / 2, "easeOutQuad", function () {
				$(element).animate({"opacity": "1"}, durationEach / 2, "easeInQuad", function () {
					if (count > 1) {
						controller.blink(element, count - 1, durationEach, callback);
					} else {
						if ($.isFunction(callback)) {
							callback();
						}
					}
				});
			});
		},
		
		spin: function (element, duration) {
			// Determine whether CSS3 transitons are supported at all
			var thisBody = document.body || document.documentElement,
				thisStyle = thisBody.style,
				cssPrefix = (thisStyle.WebkitTransition !== undefined) ? "-webkit-" : (thisStyle.MozTransition !== undefined) ? "-moz-" : (thisStyle.OTransition !== undefined) ? "-o-" : "";
			
			$(element).css(cssPrefix + "transition-property", cssPrefix + "transform").css(cssPrefix + "transition-duration", duration + "ms").css(cssPrefix + "transition-timing-function", "ease-out");
			
			setTimeout(function () {
				$(element).css(cssPrefix + "transform", "rotate(360deg)");
			});
		},
		
		flip: function (element, className, duration, callback) {
			// Determine whether CSS3 transitons are supported at all
			var thisBody = document.body || document.documentElement,
				thisStyle = thisBody.style,
				cssTransitionsSupported = thisStyle.WebkitTransition !== undefined || thisStyle.MozTransition !== undefined || thisStyle.OTransition !== undefined || thisStyle.transition !== undefined,
				cssPrefix = (thisStyle.WebkitTransition !== undefined) ? "-webkit-" : (thisStyle.MozTransition !== undefined) ? "-moz-" : (thisStyle.OTransition !== undefined) ? "-o-" : "",
				transitionEndEvent = (thisStyle.WebkitTransition !== undefined) ? "webkitTransitionEnd" : (thisStyle.OTransition !== undefined) ? "oTransitionEnd" : "transitionend";
			
			// If they are: flip and call the callback in the middle of the animation
			if (cssTransitionsSupported) {
				$(element).bind(transitionEndEvent, function () {
					$(element).unbind(transitionEndEvent);
					
					$(element).css(cssPrefix + "transition-timing-function", "ease-out").removeClass(className);
					
					if ($.isFunction(callback)) {
						callback();
					}
				}).css(cssPrefix + "transition-property", cssPrefix + "transform").css(cssPrefix + "transition-duration", duration / 2 + "ms").css(cssPrefix + "transition-timing-function", "ease-in").addClass(className);
			// If they aren't: call the callback right away
			} else {
				if ($.isFunction(callback)) {
					callback();
				}
			}
		}
	};
}());