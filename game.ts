import promptSync from "prompt-sync";
import { Dealer } from "./dealer";
import { Deck } from "./deck";
import { Player } from "./player";
import { GameState } from "./types";

class Game {
  private deck: Deck;
  private player: Player;
  private dealer: Dealer;
  private currentState: GameState;
  private playerFund: number = 10000;
  private bet: number = 0;
  prompt = promptSync();
  constructor() {
    this.deck = new Deck();
    this.deck.shuffle(); // Shuffle the deck when the game starts
    // Initialize player and dealer
    this.player = new Player();
    this.dealer = new Dealer();

    // Set the initial game state
    this.currentState = GameState.INITIALIZING;
    console.log("Welcome to the game!");
  }

  startGame(): void {
    console.log(`Starting a new game with ${this.playerFund} in funds.`);

    let action = this.prompt("Enter your bet amount: $");
    while (true) {
      if (
        action !== null &&
        action !== "" &&
        !isNaN(Number(action)) &&
        Number(action) > 0 &&
        Number(action) <= this.playerFund
      ) {
        this.bet = Number(action);
        this.playerFund -= this.bet;
        console.log(
          `Bet placed: $${this.bet}. Remaining funds: $${this.playerFund}`
        );
      } else {
        if (Number(action) === 0 && Number(action) === this.playerFund) {
          console.log("You dont' have enough funds to place a bet.");
          this.currentState = GameState.GAME_OVER;
          this.gameOver();
        } else if (Number(action) > this.playerFund) {
          console.log(
            `You cannot bet more than your current funds of $${this.playerFund}.`
          );
        } else {
          console.log("Invalid input. Please enter a valid bet amount.");
        }
        action = this.prompt("Enter your bet amount: $");
        continue;
      }

      if (this.bet > 0) {
        break;
      }
    }

    this.currentState = GameState.DEALING;
    this.dealInitialCards();

    console.log(
      `Your hand: ${this.player
        .revealHand()
        .map((card) => card.getName())
        .join(", ")} | Score: ${this.player.getScore()}`
    );
    console.log(
      `Dealer's hand: ${this.dealer
        .revealHand()
        .map((card, idx) => (idx === 0 ? "[hidden]" : card.getName()))
        .join(", ")}`
    );

    if (this.isBusted(this.player)) {
      console.log("You busted! Dealer wins.");
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
    }
    if (this.isBusted(this.dealer)) {
      console.log("Dealer busted! You win.");
      this.playerFund += this.bet * 2;
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
    }

    // Check for Blackjack
    if (
      this.player.getScore() === 21 &&
      this.player.revealHand().length === 2
    ) {
      if (
        this.dealer.getScore() === 21 &&
        this.dealer.revealHand().length === 2
      ) {
        console.log("Both player and dealer have Blackjack! It's a push.");
        this.playerFund += this.bet; //return bet
      } else {
        console.log("Blackjack! You win!");
        this.playerFund += this.bet * 2.5;
      }

      this.currentState = GameState.GAME_OVER;
      this.gameOver();
    } else if (
      this.dealer.getScore() === 21 &&
      this.dealer.revealHand().length === 2
    ) {
      console.log("Blackjack! Dealer win!");
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
    }

    this.currentState = GameState.PLAYER_TURN;
    this.playerTurn();
  }

  dealInitialCards(): void {
    for (let i = 0; i < 2; i++) {
      const playerCard = this.deck.drawCard();
      if (playerCard) {
        this.player.receiveCard(playerCard);
      }

      const dealerCard = this.deck.drawCard();
      if (dealerCard) {
        this.dealer.receiveCard(dealerCard);
      }
    }
  }

  playerTurn(): void {
    if (this.currentState !== GameState.PLAYER_TURN) {
      console.log("It's not your turn!");
      return;
    }

    while (this.currentState === GameState.PLAYER_TURN) {
      let action = this.prompt("Do you want to (h)it or (s)tand? : ");
      if (action.toLowerCase() === "h") {
        const newCard = this.deck.drawCard();
        if (newCard) {
          this.player.receiveCard(newCard);
          console.log(
            `Your hand: ${this.player
              .revealHand()
              .map((card) => card.getName())
              .join(", ")} | Score: ${this.player.getScore()}`
          );

          if (this.player.getScore() === 21) {
            console.log("You wins with a score of 21!");
            this.playerFund += this.bet * 2;
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
          }

          if (this.isBusted(this.player)) {
            console.log("You busted! Dealer wins.");
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
          }
        } else {
          this.currentState = GameState.EVALUATE_WINNER;
          this.determineWinner();
        }
      } else if (action.toLowerCase() === "s") {
        this.currentState = GameState.DEALER_TURN;
        this.dealerTurn();
      } else {
        console.log("Invalid action. Please enter 'h' to hit or 's' to stand.");
      }
    }
  }

  dealerTurn(): void {
    if (this.currentState !== GameState.DEALER_TURN) {
      console.log("It's not the dealer's turn!");
      return;
    }

    while (this.currentState === GameState.DEALER_TURN) {
      if (this.dealer.getScore() < 17) {
        const newCard = this.deck.drawCard();
        if (newCard) {
          this.dealer.receiveCard(newCard);
          console.log(
            `Dealer's hand: ${this.dealer
              .revealHand()
              .map((card, idx) => (idx === 0 ? "[hidden]" : card.getName()))
              .join(", ")}`
          );

          if (this.dealer.getScore() === 21) {
            console.log("Dealer wins with a score of 21!");
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
          }

          if (this.isBusted(this.dealer)) {
            console.log("Dealer busted! You win.");
            this.playerFund += this.bet * 2;
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
          }
        } else {
          this.currentState = GameState.EVALUATE_WINNER;
          this.determineWinner();
        }
      } else {
        this.currentState = GameState.EVALUATE_WINNER;
        this.determineWinner();
      }
    }
  }

  determineWinner(): void {
    if (this.currentState !== GameState.EVALUATE_WINNER) {
      console.log("It's not time to evaluate the winner!");
      return;
    }

    if (
      this.player.getScore() > this.dealer.getScore() &&
      !this.isBusted(this.player)
    ) {
      console.log("You win!");
      this.playerFund += this.bet * 2;
    } else if (
      this.player.getScore() < this.dealer.getScore() &&
      !this.isBusted(this.dealer)
    ) {
      console.log("Dealer wins!");
    } else {
      console.log("It's a tie! No one wins.");
      this.playerFund += this.bet;
    }
    this.currentState = GameState.GAME_OVER;
    this.gameOver();
  }

  gameOver(): void {
    if (this.currentState !== GameState.GAME_OVER) {
      console.log("The game is not over yet!");
      return;
    }
    console.log(`Your new fund total is: $${this.playerFund}`);
    this.bet = 0;
    console.log("Game over. Thank you for playing!");
    console.log(
      `Player's hand: ${this.player
        .revealHand()
        .map((c) => c.getName())
        .join(", ")} | Score: ${this.player.getScore()}`
    );
    console.log(
      `Dealer's hand: ${this.dealer
        .revealHand()
        .map((c) => c.getName())
        .join(", ")} | Score: ${this.dealer.getScore()}`
    );

    const playAgain = this.prompt("Do you want to play again? (y/n): ");
    if (playAgain.toLowerCase() === "y") {
      this.resetGame();
      this.startGame();
    } else {
      console.log("Thanks for playing!");
      process.exit();
    }
  }

  resetGame(): void {
    this.deck = new Deck();
    this.deck.shuffle();

    this.player = new Player();
    this.dealer = new Dealer();

    this.currentState = GameState.INITIALIZING;
    console.log("Welcome Again to the game!");
  }

  isBusted(dealerAndPlayerCard: unknown): boolean {
    if (
      dealerAndPlayerCard instanceof Player ||
      dealerAndPlayerCard instanceof Dealer
    ) {
      if (dealerAndPlayerCard.getScore() > 21) {
        return true;
      }
    }
    return false;
  }
}

const game = new Game();
game.startGame();
