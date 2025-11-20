class Minesweeper {
    constructor() {
        this.board = document.getElementById('game-board');
        this.mineCountDisplay = document.getElementById('mine-count');
        this.timerDisplay = document.getElementById('timer');
        this.resetBtn = document.getElementById('reset-btn');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalRestartBtn = document.getElementById('modal-restart-btn');
        this.diffBtns = document.querySelectorAll('.diff-btn');

        this.config = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };

        this.currentDiff = 'easy';
        this.rows = 0;
        this.cols = 0;
        this.mines = 0;
        this.grid = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flags = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.gameOverTimeout = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame(this.currentDiff);
    }

    setupEventListeners() {
        this.resetBtn.addEventListener('click', () => this.startNewGame(this.currentDiff));
        this.modalRestartBtn.addEventListener('click', () => {
            this.hideModal();
            this.startNewGame(this.currentDiff);
        });

        this.diffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.diffBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDiff = e.target.dataset.difficulty;
                this.startNewGame(this.currentDiff);
            });
        });
    }

    startNewGame(difficulty) {
        const settings = this.config[difficulty];
        this.rows = settings.rows;
        this.cols = settings.cols;
        this.mines = settings.mines;

        this.grid = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flags = 0;
        this.stopTimer();
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
        this.timer = 0;
        this.updateTimerDisplay();
        this.updateMineCount();
        this.resetBtn.querySelector('.emoji').textContent = '😎';
        this.hideModal();

        this.renderBoard();
    }

    renderBoard() {
        this.board.innerHTML = '';
        this.board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                cell.addEventListener('click', (e) => this.handleLeftClick(r, c));
                cell.addEventListener('contextmenu', (e) => this.handleRightClick(e, r, c));

                this.board.appendChild(cell);
                row.push({
                    element: cell,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            this.grid.push(row);
        }
    }

    handleLeftClick(r, c) {
        if (this.gameOver || this.grid[r][c].isFlagged || this.grid[r][c].isRevealed) return;

        if (this.firstClick) {
            this.placeMines(r, c);
            this.calculateNumbers();
            this.startTimer();
            this.firstClick = false;
        }

        const cell = this.grid[r][c];
        if (cell.isMine) {
            this.triggerGameOver(false, r, c);
        } else {
            this.revealCell(r, c);
            this.checkWin();
        }
    }

    handleRightClick(e, r, c) {
        e.preventDefault();
        if (this.gameOver || this.grid[r][c].isRevealed) return;

        const cell = this.grid[r][c];
        cell.isFlagged = !cell.isFlagged;

        if (cell.isFlagged) {
            cell.element.classList.add('flagged');
            cell.element.textContent = '🚩';
            this.flags++;
        } else {
            cell.element.classList.remove('flagged');
            cell.element.textContent = '';
            this.flags--;
        }

        this.updateMineCount();
    }

    placeMines(safeR, safeC) {
        let minesPlaced = 0;
        while (minesPlaced < this.mines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            // Don't place mine on first click or neighbors
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;

            if (!this.grid[r][c].isMine) {
                this.grid[r][c].isMine = true;
                minesPlaced++;
            }
        }
    }

    calculateNumbers() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].isMine) continue;

                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const nr = r + i;
                        const nc = c + j;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                            if (this.grid[nr][nc].isMine) count++;
                        }
                    }
                }
                this.grid[r][c].neighborMines = count;
            }
        }
    }

    revealCell(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
        const cell = this.grid[r][c];

        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        cell.element.classList.add('revealed');

        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines;
            cell.element.dataset.num = cell.neighborMines;
        } else {
            // Flood fill
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    this.revealCell(r + i, c + j);
                }
            }
        }
    }

    triggerGameOver(win, hitR = -1, hitC = -1) {
        this.gameOver = true;
        this.stopTimer();

        if (win) {
            this.resetBtn.querySelector('.emoji').textContent = '🥳';
            this.showModal('YOU WIN!', 'Mission Accomplished! Good job.');
        } else {
            this.resetBtn.querySelector('.emoji').textContent = '😵';
            this.revealAllMines(hitR, hitC);

            // Delay showing the modal so user can see the board
            this.gameOverTimeout = setTimeout(() => {
                this.showModal('GAME OVER', 'You hit a mine! Better luck next time.');
            }, 3000);
        }
    }

    revealAllMines(hitR, hitC) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (cell.isMine) {
                    cell.element.classList.add('mine');
                    cell.element.textContent = '💣';
                    if (r === hitR && c === hitC) {
                        cell.element.classList.add('hit-mine');
                    }
                }
            }
        }
    }

    checkWin() {
        let revealedCount = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].isRevealed) revealedCount++;
            }
        }

        if (revealedCount === (this.rows * this.cols) - this.mines) {
            this.triggerGameOver(true);
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        this.timerDisplay.textContent = this.timer.toString().padStart(3, '0');
    }

    updateMineCount() {
        const remaining = this.mines - this.flags;
        this.mineCountDisplay.textContent = remaining.toString().padStart(3, '0');
    }

    showModal(title, message) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modal.classList.remove('hidden');
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }
}

// Start game
window.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});
