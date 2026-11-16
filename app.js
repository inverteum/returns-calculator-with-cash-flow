(function () {
  var SAMPLE = [
    { date: "2016-01-01", value: 1000000, flow: 0 },
    { date: "2018-01-01", value: 1145006, flow: 0 },
    { date: "2020-07-01", value: 1605741, flow: 250000 },
    { date: "2022-12-31", value: 1901625, flow: 0 },
    { date: "2024-12-31", value: 2077372, flow: -100000 },
    { date: "2026-06-30", value: 2298471, flow: 0 }
  ];

  var tbody = document.querySelector("#entries tbody");
  var errorEl = document.getElementById("returns-error");
  var twrEl = document.getElementById("twr");
  var twrAnnEl = document.getElementById("twr-ann");
  var dietzEl = document.getElementById("dietz");
  var dietzAnnEl = document.getElementById("dietz-ann");
  var explainEl = document.getElementById("returns-explain");
  var chartEl = document.getElementById("returns-chart");

  function parseNumber(raw) {
    if (raw == null) return NaN;
    var s = String(raw).trim().replace(/,/g, "");
    if (!s) return NaN;
    return Number(s);
  }

  function formatPct(x, digits) {
    if (!isFinite(x)) return "—";
    var n = (x * 100).toFixed(digits == null ? 1 : digits);
    if (Object.is(Number(n), -0) || n === "-0.0" || n === "-0.00") n = (0).toFixed(digits == null ? 1 : digits);
    return n + "%";
  }

  function formatMoney(x) {
    if (!isFinite(x)) return "";
    return x.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function parseDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split("-");
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function compute(rows) {
    if (!rows || rows.length < 2) {
      return { error: "Enter at least two dates, including a starting value." };
    }
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].date) return { error: "Each row needs a valid date." };
      if (!(rows[i].value > 0)) return { error: "Portfolio value has to be greater than zero on every date." };
      if (!isFinite(rows[i].flow)) return { error: "Each cash flow has to be a number. Use 0 when there is none." };
    }
    for (var j = 1; j < rows.length; j++) {
      if (daysBetween(rows[j - 1].date, rows[j].date) <= 0) {
        return { error: "Dates need to be in order, with each date after the one before it." };
      }
    }

    var twrFactor = 1;
    var twrPath = [1];
    var valuePath = [1];
    var startValue = rows[0].value;
    for (var k = 1; k < rows.length; k++) {
      var prev = rows[k - 1].value;
      var r = (rows[k].value - rows[k].flow - prev) / prev;
      if (!isFinite(r) || r <= -1) {
        return { error: "A sub-period return of −100% or worse cannot be compounded. Check the values and cash flows." };
      }
      twrFactor *= 1 + r;
      twrPath.push(twrFactor);
      valuePath.push(rows[k].value / startValue);
    }
    var twr = twrFactor - 1;

    var bmv = rows[0].value;
    var emv = rows[rows.length - 1].value;
    var T = daysBetween(rows[0].date, rows[rows.length - 1].date);
    var netCF = 0;
    var weighted = 0;
    // Cash flow on the first row is treated as already in the starting value.
    for (var m = 1; m < rows.length; m++) {
      var cf = rows[m].flow;
      netCF += cf;
      var t = daysBetween(rows[0].date, rows[m].date);
      weighted += ((T - t) / T) * cf;
    }
    var denom = bmv + weighted;
    if (denom === 0) {
      return { error: "The Modified Dietz denominator is zero for these cash flows. Try a different starting value." };
    }
    var dietz = (emv - bmv - netCF) / denom;
    var years = T / 365.25;
    var twrAnn = years > 0 && twrFactor > 0 ? Math.pow(twrFactor, 1 / years) - 1 : NaN;
    var dietzAnn = years > 0 && 1 + dietz > 0 ? Math.pow(1 + dietz, 1 / years) - 1 : NaN;

    return {
      twr: twr,
      dietz: dietz,
      twrAnn: twrAnn,
      dietzAnn: dietzAnn,
      years: years,
      days: T,
      netCF: netCF,
      twrPath: twrPath,
      valuePath: valuePath,
      dates: rows.map(function (row) { return row.date; })
    };
  }

  function readRows() {
    var rows = [];
    tbody.querySelectorAll("tr").forEach(function (tr) {
      var dateVal = tr.querySelector(".col-date").value;
      rows.push({
        date: parseDate(dateVal),
        dateRaw: dateVal,
        value: parseNumber(tr.querySelector(".col-value").value),
        flow: parseNumber(tr.querySelector(".col-flow").value)
      });
    });
    return rows;
  }

  function addRow(data, focus) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><input class="col-date" type="date" required></td>' +
      '<td><input class="col-value" type="text" inputmode="decimal" autocomplete="off"></td>' +
      '<td><input class="col-flow" type="text" inputmode="decimal" autocomplete="off"></td>' +
      '<td class="col-remove"><button type="button" class="row-remove" aria-label="Remove row">&times;</button></td>';
    var row = data || { date: "", value: "", flow: 0 };
    tr.querySelector(".col-date").value = row.date || "";
    tr.querySelector(".col-value").value = row.value === "" ? "" : formatMoney(row.value);
    tr.querySelector(".col-flow").value = row.flow === "" ? "" : formatMoney(row.flow);
    tbody.appendChild(tr);
    bindRow(tr);
    if (focus) tr.querySelector(".col-date").focus();
  }

  function bindRow(tr) {
    tr.querySelector(".row-remove").addEventListener("click", function () {
      if (tbody.rows.length <= 2) {
        errorEl.textContent = "Keep at least two rows so a return can be calculated.";
        return;
      }
      tr.remove();
      render();
    });
    tr.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });
  }

  function loadSample() {
    tbody.innerHTML = "";
    SAMPLE.forEach(function (row) { addRow(row, false); });
    render();
  }

  function svgLine(values, color, width, height, pad) {
    if (!values.length) return "";
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    if (min === max) {
      min -= 0.05;
      max += 0.05;
    }
    var innerW = width - pad * 2;
    var innerH = height - pad * 2;
    var pts = values.map(function (v, i) {
      var x = pad + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      var y = pad + (1 - (v - min) / (max - min)) * innerH;
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    return '<polyline fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(" ") + '" />';
  }

  function drawChart(result) {
    var width = 800;
    var height = 220;
    var pad = 16;
    if (!result || result.error) {
      chartEl.innerHTML = "";
      return;
    }
    var axis = '<line x1="' + pad + '" y1="' + (height - pad) + '" x2="' + (width - pad) + '" y2="' + (height - pad) + '" stroke="#e4e0d8" stroke-width="1" />';
    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none" aria-hidden="true">' +
      axis +
      svgLine(result.valuePath, "#8a857c", width, height, pad) +
      svgLine(result.twrPath, "#111", width, height, pad) +
      "</svg>";
  }

  function render() {
    var result = compute(readRows());
    if (result.error) {
      errorEl.textContent = result.error;
      twrEl.textContent = "—";
      dietzEl.textContent = "—";
      twrAnnEl.textContent = "";
      dietzAnnEl.textContent = "";
      explainEl.textContent = "";
      drawChart(null);
      return;
    }
    errorEl.textContent = "";
    twrEl.textContent = formatPct(result.twr, 2);
    dietzEl.textContent = formatPct(result.dietz, 2);
    twrAnnEl.textContent = isFinite(result.twrAnn) ? formatPct(result.twrAnn, 2) + " annualized" : "";
    dietzAnnEl.textContent = isFinite(result.dietzAnn) ? formatPct(result.dietzAnn, 2) + " annualized" : "";
    var yearsLabel = result.years.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    var cfDir = result.netCF > 0 ? "a net contribution" : result.netCF < 0 ? "a net withdrawal" : "no net cash flow";
    var cmp;
    var gap = result.dietz - result.twr;
    if (Math.abs(gap) < 0.0005) {
      cmp = "On this set of dates, the two returns are nearly the same.";
    } else if (gap < 0) {
      cmp = "Modified Dietz is lower than the time-weighted return here, because more capital was in the portfolio during weaker periods.";
    } else {
      cmp = "Modified Dietz is higher than the time-weighted return here, because more capital was in the portfolio during stronger periods.";
    }
    explainEl.textContent =
      "Time-weighted return measures the portfolio’s own growth and removes the effect of when money was added or withdrawn. Modified Dietz is a money-weighted return: it reflects the timing of those cash flows. This sample covers " +
      yearsLabel + " years, with " + cfDir + ". " + cmp;
    drawChart(result);
  }


  document.getElementById("add-row").addEventListener("click", function () {
    addRow({ date: "", value: "", flow: 0 }, true);
  });
  document.getElementById("reset-sample").addEventListener("click", loadSample);

  loadSample();

  // Expose for tests
  window.__returnsMath = { compute: compute, parseDate: parseDate, daysBetween: daysBetween };
})();
