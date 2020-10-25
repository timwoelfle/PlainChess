# PlainChess
PlainChess aims to be a simple yet full–featured and beautiful alternative to the cluttered chess portals currently existing.  

## Table of contents
* [What is PlainChess?](#what-is-plainchess-)
* [Why yet another chess implementation, what makes PlainChess different?](#why-yet-another-chess-implementation--what-makes-plainchess-different-)
* [I want a list, what features do you offer?](#i-want-a-list--what-features-do-you-offer-)
* [Which chess rules exactly are implemented, which aren't?](#which-chess-rules-exactly-are-implemented--which-aren-t-)
* [I like PlainChess. How can I support you?](#i-like-plainchess-how-can-i-support-you-)
* [What features could be implemented next?](#what-features-could-be-implemented-next-)
  * [General](#general)
  * [Online mode](#online-mode)
* [You keep mentioning modern web technologies: What exactly are you talking about?](#you-keep-mentioning-modern-web-technologies--what-exactly-are-you-talking-about-)
* [Who are you and why did you make this?](#who-are-you-and-why-did-you-make-this-)

## What is PlainChess?
Its primary goal is to allow two persons to play a round of chess, no matter whether they happen to be at the same location or on a different continent.
It's designed to be platform independent and to run on every computer or smart phone equipped with a modern web browser and thus enabling people everywhere around the globe to play chess, at home and on the go, online and offline.
It was originally published in January 2011 and as of March 2013 its [code](https://GitHub.com/TimWoelfle/PlainChess) is open source and licensed under the [GPL Version 3 license](https://www.gnu.org/licenses/gpl-3.0.txt).

## Why yet another chess implementation, what makes PlainChess different?
Its minimalistic approach sets it apart from most of the other chess implementations on the internet.
They usually use browser plugins like Adobe Flash or even client software to realize the game itself and offer a variety of features around it: news, riddles, communities and dozens of little gadgets.
Due to this complexity they often take a lot of clicks to get a game started, they tend to react slowly and are often cluttered with ads.
Some even require registration fees in order to be able to play a game.
PlainChess is free, fast and built on modern web technologies but on the other hand also passes on features beyond basic gameplay.

## I want a list, what features do you offer?
* Online and offline games with an appointed partner
* Nearly full implementation of all official chess rules
* Autosaving the game for interrupted sessions
* Minimalistic and clean interface
* Platform independent due to the use of modern web technologies
* Free and ad–free


## Which chess rules exactly are implemented, which aren't?
Nearly all of them: PlainChess recognizes valid moves as well as [check](https://en.wikipedia.org/wiki/Check_(chess)), [mate](https://en.wikipedia.org/wiki/Checkmate) and [stalemate](https://en.wikipedia.org/wiki/Stalemate) situations.
It also supports the three specials moves of kings and pawns: [castling](https://en.wikipedia.org/wiki/Castling), [pawn promotions](https://en.wikipedia.org/wiki/Promotion_(chess)) and [en passant capturing](https://en.wikipedia.org/wiki/En_passant).
The only rules currently not supported are the draw rules except for stalemate: [threefold repetition](https://en.wikipedia.org/wiki/Threefold_repetition), [the fifty–move rule](https://en.wikipedia.org/wiki/Fifty-move_rule), impossibility of checkmate and [mutual agreement](https://en.wikipedia.org/wiki/Draw_by_agreement).

## I like PlainChess. How can I support you?
Spread the word, tell your friends and enemies about PlainChess; twitter, blog or write letters about it.
Share it on your social networks.
Send me an e-mail. Have a look at [the code](https://GitHub.com/TimWoelfle/PlainChess) and add new features.

## What features could be implemented next?
### General
* Support of time control and chess clocks
* Support of [FEN codes](https://en.wikipedia.org/wiki/Forsyth–Edwards_Notation) and saved games
* Support of at least some of the draw rules
* Optimized layout for smart phones


### Online mode
* Synchronized game time for time control and chess clocks
* Server side turn saving for rejoins and spectator mode
* Player pings for recognition of disconnection


## You keep mentioning modern web technologies: What exactly are you talking about?
PlainChess is the first chess implementation built completely with HTML5 technologies (at least as far as I know).
The game engine is written in JavaScript and relies on the frameworks [jQuery](https://jquery.com) and [jQuery UI](https://jqueryui.com), which means that offline games can be played without internet connectivity (this would be interesting for a smart phone optimized version with [HTML5 manifest](https://www.w3.org/TR/html5/offline.html)).
The design uses CSS3 en masse: rounded borders, shadows, opacity, sprite images and transitions & transforms.

## Who are you and why did you make this?
I'm Tim Wölfle from Germany and wanted to try out the new possibilities HTML5 technologies offer.
At the same time I wanted to play a quick round of chess with a friend on the internet, but didn't find anything that would allow me to start right away and without registration.
