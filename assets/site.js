
(function () {
  var REPO = "aboriginalintelligence/aboriginalintelligence.github.io";
  function applyLayout() {
    var wide = window.matchMedia("(min-width: 900px)").matches;
    document.documentElement.setAttribute("data-layout", wide ? "desk" : "phone");
  }
  applyLayout();
  window.addEventListener("resize", applyLayout);
  document.querySelectorAll("[data-doc]").forEach(function (box) {
    var slug = box.getAttribute("data-doc");
    var title = box.getAttribute("data-title");
    var label = "doc:" + slug;
    var list = box.querySelector(".comment-list");
    var form = box.querySelector("form");
    var approve = box.querySelector("[data-approve]");
    function line(text) {
      var p = document.createElement("p");
      p.className = "fine";
      p.textContent = text;
      return p;
    }
    fetch("https://api.github.com/repos/" + REPO + "/issues?state=all&per_page=50&labels=" + encodeURIComponent(label), {
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (issues) {
      var rows = (issues || []).filter(function (issue) { return !issue.pull_request; });
      function isApproval(issue) {
        var text = issue.body || "";
        return text.indexOf("I approve this document.") !== -1 && text.length < 240;
      }
      function score(issue) {
        var replies = issue.comments || 0;
        var reactions = issue.reactions && issue.reactions.total_count ? issue.reactions.total_count : 0;
        return replies * 10 + reactions;
      }
      var approvals = rows.filter(isApproval);
      var topics = rows.filter(function (issue) { return !isApproval(issue); });
      topics.sort(function (a, b) {
        var diff = score(b) - score(a);
        if (diff) return diff;
        return a.created_at < b.created_at ? 1 : -1;
      });
      var count = box.querySelector(".approval-count");
      if (count) {
        count.textContent = approvals.length
          ? approvals.length + (approvals.length === 1 ? " person has approved this document." : " people have approved this document.")
          : "No approvals yet.";
      }
      list.textContent = "";
      if (!topics.length) {
        list.appendChild(line("No topics yet. Pick a suggestion, or write the first one."));
        return;
      }
      topics.forEach(function (issue) {
        var text = issue.body || "";
        var lines = text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var kept = lines.filter(function (s) {
          return s.indexOf("Name:") !== 0 && s.indexOf("Posted from") !== 0;
        });
        var item = document.createElement("article");
        item.className = "comment";
        var who = document.createElement("div");
        who.className = "who";
        who.textContent = issue.user && issue.user.login ? issue.user.login : "Member";
        var when = document.createElement("div");
        when.className = "when";
        var replies = issue.comments || 0;
        when.textContent = (issue.created_at || "").slice(0, 10) + ". " + replies + (replies === 1 ? " reply." : " replies.");
        var heading = document.createElement("div");
        heading.className = "topic-title";
        heading.textContent = kept[0] || issue.title || "Comment";
        var body = document.createElement("p");
        body.textContent = kept.join("\n");
        item.appendChild(who);
        item.appendChild(when);
        item.appendChild(heading);
        item.appendChild(body);
        if (issue.html_url) {
          var more = document.createElement("a");
          more.href = issue.html_url;
          more.textContent = "Reply";
          item.appendChild(more);
        }
        list.appendChild(item);
      });
    }).catch(function () {
      list.textContent = "";
      list.appendChild(line("Earlier comments could not be loaded. You can still post one."));
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = form.name.value.trim();
      var comment = form.comment.value.trim();
      if (comment.length < 2) return;
      var body = "Name: " + (name || "Not given") + "\n\n" + comment + "\n\nPosted from the forum.";
      var topic = comment.split("\n")[0].trim().slice(0, 140) || title;
      var href = "https://github.com/" + REPO + "/issues/new?labels=" + encodeURIComponent(label)
        + "&title=" + encodeURIComponent(topic)
        + "&body=" + encodeURIComponent(body);
      window.location.href = href;
    });
    if (approve) {
      approve.addEventListener("click", function () {
        var name = form.name.value.trim();
        var body = "Name: " + (name || "Not given") + "\n\nI approve this document.\n\nPosted from the forum.";
        var href = "https://github.com/" + REPO + "/issues/new?labels=" + encodeURIComponent(label)
          + "&title=" + encodeURIComponent("I approve " + title)
          + "&body=" + encodeURIComponent(body);
        window.location.href = href;
      });
    }
  });
  document.querySelectorAll("[data-board]").forEach(function (box) {
    var list = box.querySelector(".comment-list");
    var names = {};
    var nameNode = document.getElementById("doc-names");
    if (nameNode) {
      try { names = JSON.parse(nameNode.textContent); } catch (err) { names = {}; }
    }
    function line(text) {
      var p = document.createElement("p");
      p.className = "fine";
      p.textContent = text;
      return p;
    }
    function isApproval(issue) {
      var text = issue.body || "";
      return text.indexOf("I approve this document.") !== -1 && text.length < 240;
    }
    function score(issue) {
      var replies = issue.comments || 0;
      var reactions = issue.reactions && issue.reactions.total_count ? issue.reactions.total_count : 0;
      return replies * 10 + reactions;
    }
    var query = "repo:" + REPO + " is:issue";
    fetch("https://api.github.com/search/issues?q=" + encodeURIComponent(query) + "&sort=comments&order=desc&per_page=30", {
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (data) {
      var topics = ((data && data.items) || []).filter(function (issue) {
        return !issue.pull_request && !isApproval(issue);
      });
      topics.sort(function (a, b) {
        var diff = score(b) - score(a);
        if (diff) return diff;
        return a.created_at < b.created_at ? 1 : -1;
      });
      list.textContent = "";
      if (!topics.length) {
        list.appendChild(line("No topics yet. Open a document and pick a suggestion."));
        return;
      }
      topics.forEach(function (issue) {
        var text = issue.body || "";
        var lines = text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var kept = lines.filter(function (s) {
          return s.indexOf("Name:") !== 0 && s.indexOf("Posted from") !== 0;
        });
        var slug = "";
        (issue.labels || []).forEach(function (lab) {
          var name = lab && lab.name ? lab.name : "";
          if (name.indexOf("doc:") === 0) slug = name.slice(4);
        });
        var item = document.createElement("article");
        item.className = "comment";
        var heading = document.createElement("div");
        heading.className = "topic-title";
        heading.textContent = kept[0] || issue.title || "Comment";
        var when = document.createElement("div");
        when.className = "when";
        var replies = issue.comments || 0;
        var where = slug && names[slug] ? names[slug] : "Forum";
        when.textContent = where + ". " + replies + (replies === 1 ? " reply." : " replies.");
        item.appendChild(heading);
        item.appendChild(when);
        if (slug) {
          var back = document.createElement("a");
          back.href = slug + ".html";
          back.textContent = "Open this document";
          item.appendChild(document.createTextNode(" "));
          item.appendChild(back);
        }
        if (issue.html_url) {
          var more = document.createElement("a");
          more.href = issue.html_url;
          more.textContent = "Reply";
          item.appendChild(document.createTextNode(" "));
          item.appendChild(more);
        }
        list.appendChild(item);
      });
    }).catch(function () {
      list.textContent = "";
      list.appendChild(line("Topics could not be loaded. You can still open a document and post one."));
    });
  });
  document.querySelectorAll("[data-suggest]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var box = document.querySelector("[data-doc]");
      if (!box) return;
      var target = box.querySelector("form");
      if (!target) return;
      target.comment.value = btn.getAttribute("data-suggest") || "";
      target.comment.focus();
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
