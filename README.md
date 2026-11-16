# Returns calculator with cash flow

A client-only HTML5/JS calculator for time-weighted and money-weighted (Modified Dietz) returns that takes contributions and withdrawals into account. There is no server.

Use it at [inverteum.com/coding/returns-calculator-with-cash-flow](https://www.inverteum.com/coding/returns-calculator-with-cash-flow/).

## How to open

Open `index.html` in a browser, or serve the folder with any static file server, for example:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. No build step and no dependencies are required.

## What it does

- Each row is a date, the portfolio’s market value at the end of that day, and any cash added (positive) or withdrawn (negative) that day. The value already includes that cash flow. The first row is the starting value.
- You can add or remove rows, or restore the sample series. The default portfolio values are based on a hypothetical 7% annual return.
- Results show the time-weighted return and the Modified Dietz return, including annualized figures when the window is long enough, and a chart of time-weighted growth of $1 against portfolio value.

Figures on this page are illustrative. They are not Inverteum performance, and they are not a forecast.
