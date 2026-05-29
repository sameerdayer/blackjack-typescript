import promptSync from "prompt-sync";
import { Dealer } from "./dealer.ts";
import { Deck } from "./deck.ts";
import { Player } from "./player.ts";
import { GameState } from "./types.ts";

class Game {
  private deck: Deck;
  private player: Player;
  private dealer: Dealer;
  private currentState: GameState;
  private playerFund: number = 10000;
  private bet: number = 0;
  private prompt = promptSync();

  constructor() {
    this.deck = new Deck();
    this.deck.shuffle();
    this.player = new Player();
    this.dealer = new Dealer();
    this.currentState = GameState.INITIALIZING;
  }

  startGame(): void {
    console.log("Welcome to Blackjack! 🃏");
    console.log(
      `Starting with ${this.playerFund.toLocaleString("en-IN")} in funds.`,
    );
    this.promptBet();
  }

  private promptBet(): void {
    let action: string;
    let amount: number;

    while (true) {
      action = this.prompt("Enter your bet amount: $");
      amount = Number(action);

      if(!action || isNaN(amount) || amount <= 0) {
        console.log("Invalid input. Please enter a valid bet amount.");
        continue;
      }
      if(amount > this.playerFund) {
        console.log(`You cannot bet more than $${this.playerFund.toLocaleString("en-IN")}.`);
        continue;
      }
      break;
    }
    
    this.bet = Number(action);
    this.playerFund -= this.bet;
    console.log(
      `Bet placed: $${this.bet.toLocaleString("en-IN")} | Remaining funds: $${this.playerFund.toLocaleString("en-IN")}`,
    );
    this.currentState = GameState.DEALING;
    this.dealInitialCards();
  }

  private dealInitialCards(): void {
    for (let i = 0; i < 2; i++) {
      const pc = this.deck.drawCard();
      if (pc) this.player.receiveCard(pc);

      const dc = this.deck.drawCard();
      if (dc) this.dealer.receiveCard(dc);
    }

    console.log(
      `Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`,
    );
    console.log(`Dealer's hand: ${this.getDealerVisibleStr()}`);

    if (this.isBusted(this.player)) {
      console.log("You busted! Dealer wins.");
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
      return;
    }
    if (this.isBusted(this.dealer)) {
      console.log("Dealer busted! You win.");
      this.playerFund += this.bet * 2;
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
      return;
    }

    // Check for Blackjack
    const playerBJ =
      this.player.getScore() === 21 && this.player.revealHand().length === 2;
    const dealerBJ =
      this.dealer.getScore() === 21 && this.dealer.revealHand().length === 2;

    if (playerBJ && dealerBJ) {
      console.log("Both have Blackjack! It's a push.");
      this.playerFund += this.bet;
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
      return;
    }
    if (playerBJ) {
      console.log("🎉 Blackjack! You win!");
      this.playerFund += this.bet * 2.5;
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
      return;
    }
    if (dealerBJ) {
      console.log("Dealer has Blackjack! Dealer wins.");
      this.currentState = GameState.GAME_OVER;
      this.gameOver();
      return;
    }

    this.currentState = GameState.PLAYER_TURN;
    this.playerTurn();
  }

  private playerTurn(): void {
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
            `Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`,
          );

          if (this.player.getScore() === 21) {
            console.log("You hit 21!");
            this.playerFund += this.bet * 2;
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
            return;
          }

          if (this.isBusted(this.player)) {
            console.log("Bust! Dealer wins.");
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
            return;
          }
        } else {
          this.currentState = GameState.EVALUATE_WINNER;
          this.determineWinner();
          return;
        }
      } else if (action.toLowerCase() === "s") {
        console.log("You stand.");
        this.currentState = GameState.DEALER_TURN;
        this.dealerTurn();
      } else {
        console.log("Invalid. Enter 'h' to hit or 's' to stand.");
      }
    }
  }

  private dealerTurn(): void {
    console.log(
      `Dealer reveals: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`,
    );

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
            `Dealer's hand: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`,
          );

          if (this.dealer.getScore() === 21) {
            console.log("Dealer hits 21! Dealer wins.");
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
            return;
          }

          if (this.isBusted(this.dealer)) {
            console.log("Dealer busts! You win! 🎉");
            this.playerFund += this.bet * 2;
            this.currentState = GameState.GAME_OVER;
            this.gameOver();
            return;
          }
        } else {
          this.currentState = GameState.EVALUATE_WINNER;
          this.determineWinner();
          return;
        }
      } else {
        this.currentState = GameState.EVALUATE_WINNER;
        this.determineWinner();
        return;
      }
    }
  }

  private determineWinner(): void {
    if (this.currentState !== GameState.EVALUATE_WINNER) {
      console.log("It's not time to evaluate the winner!");
      return;
    }

    const ps = this.player.getScore();
    const ds = this.dealer.getScore();

    if (ps > ds && !this.isBusted(this.player)) {
      console.log(`You win! (${ps} vs ${ds}) 🎉`);
      this.playerFund += this.bet * 2;
    } else if (ps < ds && !this.isBusted(this.dealer)) {
      console.log(`Dealer wins! (${ps} vs ${ds})`);
    } else {
      console.log(`Push! It's a tie. (${ps} vs ${ds})`);
      this.playerFund += this.bet;
    }
    this.currentState = GameState.GAME_OVER;
    this.gameOver();
  }

  private gameOver(): void {
    if (this.currentState !== GameState.GAME_OVER) {
      console.log("The game is not over yet!");
      return;
    }

    console.log("--- Round Over ---");
    console.log(
      `Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`,
    );
    console.log(
      `Dealer hand: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`,
    );
    console.log(`Your funds: $${this.playerFund.toLocaleString("en-IN")}`);
    this.bet = 0;

    if (this.playerFund <= 0) {
      console.log("You're out of funds. Game over!");
      process.exit();
    }

    let playAgain = this.prompt("Do you want to play again? (y/n): ");
    while (playAgain.toLowerCase() !== "y" && playAgain.toLowerCase() !== "n") {
      console.log(
        "Invalid input. Please enter 'y' to play again or 'n' to exit.",
      );
      playAgain = this.prompt("Do you want to play again? (y/n): ");
    }
    if (playAgain.toLowerCase() === "y") {
      this.resetGame();
      this.startGame();
    } else {
      console.log("Thanks for playing!");
      process.exit();
    }
  }

  private resetGame(): void {
    this.deck = new Deck();
    this.deck.shuffle();
    this.player = new Player();
    this.dealer = new Dealer();
    this.currentState = GameState.INITIALIZING;
  }

  private getPlayerHandStr(): string {
    return this.player
      .revealHand()
      .map((c) => c.getName())
      .join(", ");
  }

  private getDealerVisibleStr(): string {
    return this.dealer
      .revealHand()
      .map((c, i) => (i === 0 ? "[hidden]" : c.getName()))
      .join(", ");
  }

  private getDealerFullStr(): string {
    return this.dealer
      .revealHand()
      .map((c) => c.getName())
      .join(", ");
  }

  private isBusted(entity: Player | Dealer): boolean {
    return entity.getScore() > 21;
  }
}

const game = new Game();
game.startGame();
