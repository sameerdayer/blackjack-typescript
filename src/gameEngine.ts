import { Dealer } from "./dealer.ts";
import { Deck } from "./deck.ts";
import { Player } from "./player.ts";

type OutputFn = (msg: string) => void;
type InputHandler = (input: string) => void;

export class GameEngine {
  private deck: Deck;
  private player: Player;
  private dealer: Dealer;
  private playerFund: number = 10000;
  private bet: number = 0;
  private output: OutputFn;
  private pendingInputHandler: InputHandler | null = null;

  constructor(output: OutputFn) {
    this.output = output;
    this.deck = new Deck();
    this.deck.shuffle();
    this.player = new Player();
    this.dealer = new Dealer();
  }

  start(): void {
    this.output("Welcome to Blackjack! 🃏");
    this.output(`Starting with $${this.playerFund.toLocaleString("en-IN")} in funds.`);
    this.promptBet();
  }

  handleInput(input: string): void {
    if (this.pendingInputHandler) {
      const handler = this.pendingInputHandler;
      this.pendingInputHandler = null;
      handler(input.trim());
    }
  }

  private prompt(question: string, handler: InputHandler): void {
    this.output(`PROMPT:${question}`);
    this.pendingInputHandler = handler;
  }

  private promptBet(): void {
    this.prompt(`Enter your bet amount (funds: $${this.playerFund.toLocaleString("en-IN")}): $`, (input) => {
      const amount = Number(input);
      if (!input || isNaN(amount) || amount <= 0) {
        this.output("Invalid input. Please enter a valid bet amount.");
        this.promptBet();
        return;
      }
      if (amount > this.playerFund) {
        this.output(`You cannot bet more than $${this.playerFund.toLocaleString("en-IN")}.`);
        this.promptBet();
        return;
      }
      this.bet = amount;
      this.playerFund -= this.bet;
      this.output(`Bet placed: $${this.bet.toLocaleString("en-IN")} | Remaining: $${this.playerFund.toLocaleString("en-IN")}`);
      this.dealInitialCards();
    });
  }

  private dealInitialCards(): void {
    for (let i = 0; i < 2; i++) {
      const pc = this.deck.drawCard();
      if (pc) this.player.receiveCard(pc);
      const dc = this.deck.drawCard();
      if (dc) this.dealer.receiveCard(dc);
    }

    this.output(`Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`);
    this.output(`Dealer shows: ${this.getDealerVisibleStr()}`);

    if (this.isBusted(this.player)) {
      this.output("You busted! Dealer wins.");
      this.endRound();
      return;
    }
    if (this.isBusted(this.dealer)) {
      this.output("Dealer busted! You win.");
      this.playerFund += this.bet * 2;
      this.endRound();
      return;
    }

    // Check Blackjack
    const playerBJ = this.player.getScore() === 21 && this.player.revealHand().length === 2;
    const dealerBJ = this.dealer.getScore() === 21 && this.dealer.revealHand().length === 2;

    if (playerBJ && dealerBJ) {
      this.output("Both have Blackjack! It's a push.");
      this.playerFund += this.bet;
      this.endRound();
      return;
    }
    if (playerBJ) {
      this.output("🎉 Blackjack! You win!");
      this.playerFund += this.bet * 2.5;
      this.endRound();
      return;
    }
    if (dealerBJ) {
      this.output("Dealer has Blackjack! Dealer wins.");
      this.endRound();
      return;
    }

    this.promptPlayerAction();
  }

  private promptPlayerAction(): void {
    this.prompt("(h)it or (s)tand?", (input) => {
      if (input.toLowerCase() === "h") {
        const card = this.deck.drawCard();
        if (card) {
          this.player.receiveCard(card);
          this.output(`Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`);

          if (this.player.getScore() === 21) {
            this.output("You hit 21!");
            this.playerFund += this.bet * 2;
            this.endRound();
            return;
          }
          if (this.isBusted(this.player)) {
            this.output("Bust! Dealer wins.");
            this.endRound();
            return;
          }
        } else {
          this.determineWinner();
          return;
        }
        this.promptPlayerAction();
      } else if (input.toLowerCase() === "s") {
        this.output("You stand.");
        this.runDealerTurn();
      } else {
        this.output("Invalid. Enter 'h' to hit or 's' to stand.");
        this.promptPlayerAction();
      }
    });
  }

  private runDealerTurn(): void {
    this.output(`Dealer reveals: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`);

    const drawNext = () => {
      if (this.dealer.getScore() < 17) {
        const card = this.deck.drawCard();
        if (card) {
          this.dealer.receiveCard(card);
          this.output(`Dealer draws: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`);
          if (this.dealer.getScore() === 21) {
            this.output("Dealer hits 21! Dealer wins.");
            this.endRound();
            return;
          }
          if (this.isBusted(this.dealer)) {
            this.output("Dealer busts! You win! 🎉");
            this.playerFund += this.bet * 2;
            this.endRound();
            return;
          }
          drawNext();
        } else {
          this.determineWinner();
        }
      } else {
        this.determineWinner();
      }
    };

    drawNext();
  }

  private determineWinner(): void {
    const ps = this.player.getScore();
    const ds = this.dealer.getScore();
    if (ps > ds && !this.isBusted(this.player)) {
      this.output(`You win! (${ps} vs ${ds}) 🎉`);
      this.playerFund += this.bet * 2;
    } else if (ds > ps && !this.isBusted(this.dealer)) {
      this.output(`Dealer wins. (${ds} vs ${ps})`);
    } else {
      this.output(`Push! It's a tie. (${ps} vs ${ds})`);
      this.playerFund += this.bet;
    }
    this.endRound();
  }

  private endRound(): void {
    this.output(`--- Round Over ---`);
    this.output(`Your hand: ${this.getPlayerHandStr()} | Score: ${this.player.getScore()}`);
    this.output(`Dealer hand: ${this.getDealerFullStr()} | Score: ${this.dealer.getScore()}`);
    this.output(`Your funds: $${this.playerFund.toLocaleString("en-IN")}`);
    this.bet = 0;

    if (this.playerFund <= 0) {
      this.output("You're out of funds. Game over!");
      return;
    }

    this.promptPlayAgain();
  }

  private resetGame(): void {
    this.deck = new Deck();
    this.deck.shuffle();
    this.player = new Player();
    this.dealer = new Dealer();
  }

  private getPlayerHandStr(): string {
    return this.player.revealHand().map((c) => c.getName()).join(", ");
  }

  private getDealerVisibleStr(): string {
    return this.dealer.revealHand().map((c, i) => (i === 0 ? "[hidden]" : c.getName())).join(", ");
  }

  private getDealerFullStr(): string {
    return this.dealer.revealHand().map((c) => c.getName()).join(", ");
  }

  private isBusted(entity: Player | Dealer): boolean {
    return entity.getScore() > 21;
  }

  private promptPlayAgain(): void {
    this.prompt("Play again? (y/n): ", (input) => {
      if (input.toLowerCase() === "y") {
        this.resetGame();
        this.output("--- New Round ---");
        this.promptBet();
      } else if (input.toLowerCase() === "n") {
        this.output("Thanks for playing! 🃏");
      } else {
        this.output("Invalid input. Please enter 'y' or 'n'.");
        this.promptPlayAgain();
      }
    });
  }
 
}
