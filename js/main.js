/* LOADING SUPABASE */
let supabase;
document.addEventListener("DOMContentLoaded", async (event) => {
  supabase = window.supabase;
  // Subscribe to channels
  const channel = supabase.channel("realtime_broadcasts");
  channel
    .on("broadcast", { event: "delete" }, (payload) => {
      realtimeDeleteRecieved(payload.payload);
    })
    .subscribe();
  channel.on("broadcast", { event: "delete-all" }, (payload) => {
    realtimeDeleteAllRecieved();
  });
  channel.on("broadcast", { event: "swap" }, (payload) => {
    realtimeSwapRecieved(payload.payload);
  });
  channel.on("broadcast", { event: "update" }, (payload) => {
    realtimeUpdateRecieved(payload.payload);
  });
  channel.on("broadcast", { event: "new" }, (payload) => {
    realtimeNewRecieved(payload.payload);
  });
  channel.on("broadcast", { event: "new-note" }, (payload) => {
    realtimeNewNoteRecieved(payload.payload);
  });
  channel.on("broadcast", { event: "delete-note" }, (payload) => {
    realtimeDeleteNoteRecieved(payload.payload);
  });
  channel.on("broadcast", { event: "save-note" }, (payload) => {
    realtimeSaveNoteRecieved(payload.payload);
  });

  // Create page
  const data = await getData();
  updatePercentPossesed();
  data.sort(
    (a, b) =>
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
  );
  for (var row of data) {
    createCollectionElement(row);
  }
});
/* FOR EDITING A COLLECTION */
let editing = false;
/* IF USER CLICKS CTRL+F */
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "f") {
    event.preventDefault();
    openSearchModal(document.createElement("span"));
  }
});

// Get Data. If querying for a row, the row is returned. The row must exist
async function getData(collection = false) {
  const { data, error } = await supabase.from("collections").select();
  if (collection) {
    for (var row of data) {
      if (row.collection_name == collection) {
        return row;
      }
    }
  }
  return data;
}

/* HELPER FUNCTIONS */
const docID = (id) => document.getElementById(id);
const HTMLEscape = (txt) => txt.replace(/&/gm, "&amp;").replace(/</gm, "&gt;");

/* MODALS HANDLING */
// Get modals closing on non-dynamic elements:
const modalClosing = document.querySelectorAll("[data-closeModal]");
modalClosing.forEach((element) => {
  element.addEventListener("click", function closeModalHandler(event) {
    closeModal(event.currentTarget.dataset.closemodal);
  });
});
function openModal(id, el) {
  document.documentElement.classList.add("modal-is-opening");
  docID(id).setAttribute("open", true);
  if (el) {
    el.setAttribute("aria-busy", "false");
  }
}
function closeModal(id, el = false) {
  document.documentElement.classList.remove("modal-is-opening");
  docID(id).setAttribute("open", "false");
  if (el) {
    el.setAttribute("aria-busy", "false");
  }
}

/* CREATE COLLECTIONS */
function createCollectionElement(row) {
  const article = document.createElement("article");
  article.classList.add("collection");
  article.id = "collection-" + row.collection_name;
  article.style.setProperty(
    "--highlight-color",
    `var(--pico-color-${row.colour}-500)`
  );
  article.setAttribute("collection", row.collection_name);
  article.innerHTML = `<h1>${HTMLEscape(row.collection_name)}</h1>
    <div class="vert-scroll">
    <div class="cardlist">
      ${row.unpossessed_cards
        .map(
          (x) =>
            `<span onclick="changePossession(this,true)">☐ ${HTMLEscape(
              x
            )}</span>`
        )
        .join("")}
    </div>
    <div class="cardlist possessedDiv">
    ${row.possessed_cards
      .map(
        (x) =>
          `<span onclick="changePossession(this,false)">☑ ${HTMLEscape(
            x
          )}</span>`
      )
      .join("")}
    </div>
</div>
    <div class="collectionMenu">
      <div class="menu-button" onclick="openEditModal(false, this)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-pencil"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </div>
      <div class="menu-button" onclick="openDeleteCollectionModal(this,false)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-trash-2"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      </div>
    </div>`;
  const collections = docID("collections");
  collections.appendChild(article);
}

/* UPDATE PERCENT POSESSED */
async function updatePercentPossesed(data = false) {
  if (!data) {
    data = await getData();
  }
  const possessedNumber = data
    .map((x) => x.possessed_cards.length)
    .reduce((a, b) => a + b, 0);
  const unpossessedNumber = data
    .map((x) => x.unpossessed_cards.length)
    .reduce((a, b) => a + b, 0);
  if (unpossessedNumber == 0) {
    docID("percentPosessed").innerHTML = "100";
  } else if (possessedNumber == 0) {
    docID("percentPosessed").innerHTML = "0";
  } else {
    docID("percentPosessed").innerHTML = (
      (possessedNumber / (possessedNumber + unpossessedNumber)) *
      100
    ).toFixed(1);
  }
}

/* EDITING FULL COLLECTIONS AND MAKING NEW COLLECTIONS */
async function openEditModal(createNewCollection, el) {
  el.setAttribute("aria-busy", "true");
  const submitButton = docID("formSubmitButton");
  document.getElementById("formCollectionName").removeAttribute("aria-invalid");
  submitButton.disabled = true;
  submitButton.innerText = "Add New Collection";
  let data = {
    collection_name: "",
    possessed_cards: [],
    unpossessed_cards: [],
    colour: "red",
  };
  if (!createNewCollection) {
    const collection_name = el.closest("article").getAttribute("collection");
    data = await getData(collection_name);
    document
      .getElementById("formCollectionName")
      .setAttribute("aria-invalid", "false");
    submitButton.disabled = false;
    editing = collection_name;
    submitButton.innerText = "Update Collection";
  }
  docID("formCollectionName").value = data.collection_name;
  docID("formNeedToGetList").value = data.unpossessed_cards.join("\n");
  docID("formHaveList").value = data.possessed_cards.join("\n");
  selectcolour(docID(data.colour));
  openModal("edit-add-collection", el);
  docID("edit-add-collection").querySelector("article").scrollTop = 0;
}
function selectcolour(el) {
  document
    .querySelector(".color-selection [data-selected='true']")
    .setAttribute("data-selected", "false");
  el.setAttribute("data-selected", "true");
}
// Submit and add new collection to html and database
async function addNewCollection() {
  function splitCards(id) {
    const value = docID(id).value.trim();
    if (value == "") {
      return [];
    }
    const list = [];
    for (var row of value.split("\n")) {
      if (row.trim() == "SIDEBOARD:" || row.trim() == "") {
        continue;
      }
      if (row.match(/^\d+ /)) {
        const digit = Number(row.match(/^\d+/));
        const cardName = row.replace(/^\d+ /, "");
        for (let i = 0; i < digit; i++) {
          list.push(cardName);
        }
      } else {
        list.push(row);
      }
    }
    return list.sort();
  }
  const name = docID("formCollectionName").value;
  const submitButton = docID("formSubmitButton");
  submitButton.setAttribute("aria-busy", true);
  const { data, errorUnused } = await supabase.from("collections").select();
  if (!(editing && editing == name)) {
    for (let row of data) {
      if (row.collection_name == name) {
        docID("formSmall").innerHTML =
          "Invalid Name. Collection names must be unique.";
        document
          .getElementById("formCollectionName")
          .setAttribute("aria-invalid", "true");
        submitButton.setAttribute("aria-busy", false);
        submitButton.disabled = true;
        document
          .getElementById("edit-add-collection")
          .querySelector("article").scrollTop = 0;
        return;
      }
    }
  }
  const row = {
    colour: document.querySelector("[data-selected='true']").id,
    collection_name: name,
    possessed_cards: splitCards("formHaveList"),
    unpossessed_cards: splitCards("formNeedToGetList"),
  };
  if (editing) {
    let payload = { row, old_collection_name: editing };
    const { error } = await supabase
      .from("collections")
      .update(row)
      .eq("collection_name", editing);
    editing = false;
    await sendBroadcast("update", payload);
  } else {
    const { error } = await supabase.from("collections").insert(row);
    await sendBroadcast("new", row);
  }
  closeModal("edit-add-collection", submitButton);
}
// For validating the entered collection name
function checkFormCollectionName(el) {
  const formSubmitButton = docID("formSubmitButton");
  if (el.value.trim() == "") {
    el.setAttribute("aria-invalid", true);
    el.parentElement.querySelector("small").innerHTML = "Name Must Have Text";
    formSubmitButton.disabled = true;
  } else {
    el.setAttribute("aria-invalid", false);
    el.parentElement.querySelector("small").innerHTML = "<br>";
    formSubmitButton.disabled = false;
  }
}

/* DELETING COLLECTION */
async function openDeleteCollectionModal(el, all = false) {
  el.setAttribute("aria-busy", "true");
  const modal = docID("deleationconfrimation");
  if (all) {
    modal.style.setProperty("--highlight-color", "var(--pico-primary)");
    docID("collection-delete-name").innerText = "ALL COLLECTIONS";
    document
      .getElementById("deleteConfirmationButton")
      .setAttribute("all", "true");
  } else {
    const collection_name = el.closest("article").getAttribute("collection");
    const data = await getData(collection_name);
    modal.style.setProperty(
      "--highlight-color",
      `var(--pico-color-${data.colour}-500)`
    );
    docID("collection-delete-name").innerText = collection_name;
    document
      .getElementById("deleteConfirmationButton")
      .setAttribute("collection", collection_name);
    document
      .getElementById("deleteConfirmationButton")
      .setAttribute("all", "false"); // even if they cancle the delete all, this resets for the single delete
  }
  openModal("deleationconfrimation", el);
}
async function deleteConfirmed(el) {
  el.setAttribute("aria-busy", "true");
  const collection_name = el.getAttribute("collection");
  if (el.getAttribute("all") == "true") {
    const response = await supabase
      .from("collections")
      .delete()
      .neq("colour", "NEVEREQUAL"); // Delete all
    await sendBroadcast("delete-all", {});
  } else {
    const response = await supabase
      .from("collections")
      .delete()
      .eq("collection_name", collection_name);
    await sendBroadcast("delete", { collection_name });
  }
  closeModal("deleationconfrimation", el);
}
/* CHANGING WHEATHER YOU HAVE THE CARD OR NOT */
async function changePossession(span, switchToPossessing) {
  if (span.getAttribute("disabled") == "true") {
    return;
  }
  span.setAttribute("aria-busy", "true");
  span.setAttribute("disabled", "true");
  const collection_name = span.closest("article").getAttribute("collection");
  const cardName = span.innerText.replace(/^. /, "");
  const row = await getData(collection_name);
  const unpossessed_cards = row.unpossessed_cards;
  const possessed_cards = row.possessed_cards;
  // Update database
  if (switchToPossessing) {
    unpossessed_cards.splice(unpossessed_cards.indexOf(cardName), 1);
    possessed_cards.push(cardName);
    possessed_cards.sort();
  } else {
    possessed_cards.splice(possessed_cards.indexOf(cardName), 1);
    unpossessed_cards.push(cardName);
    unpossessed_cards.sort();
  }
  const { error } = await supabase
    .from("collections")
    .update({ possessed_cards, unpossessed_cards })
    .eq("collection_name", collection_name);
  await sendBroadcast("swap", {
    collection_name,
    cardName,
    switchToPossessing,
    textContent: span.innerText,
  });
}

/* SEARCH MODAL */
async function openSearchModal(el) {
  el.setAttribute("aria-busy", "true");
  const input = docID("searchInput");
  input.value = "";
  docID("searchCollections").innerHTML = "";
  for (var row of await getData()) {
    createSearchCollectionElement(row);
  }
  openModal("search-modal", el);
  updateSearchResults();
  docID("searchCollections").top = 0;
  input.focus();
}
function createSearchCollectionElement(row, toEnd = false) {
  const article = document.createElement("article");
  article.classList.add("search-collection");
  article.id = "search-collection-" + row.collection_name;
  article.style.setProperty(
    "--highlight-color",
    `var(--pico-color-${row.colour}-500)`
  );
  article.setAttribute("collection", row.collection_name);
  article.innerHTML = `<h3>${HTMLEscape(row.collection_name)}</h3>
      <div class="cardlist">
        ${row.unpossessed_cards
          .map(
            (x) =>
              `<span onclick="changePossession(this,true)">☐ ${HTMLEscape(
                x
              )}</span>`
          )
          .join("")}
      </div>
      <div class="cardlist possessedDiv">
      ${row.possessed_cards
        .map(
          (x) =>
            `<span onclick="changePossession(this,false)">☑ ${HTMLEscape(
              x
            )}</span>`
        )
        .join("")}
  </div>`;
  const searchCollections = docID("searchCollections");
  if (toEnd) {
    searchCollections.insertBefore(article, searchCollections.lastElementChild);
  } else {
    searchCollections.appendChild(article);
  }
}
function updateSearchResults() {
  const searchValue = docID("searchInput").value;
  for (var article of docID("searchCollections").querySelectorAll("article")) {
    let show = false;
    for (var span of article.querySelectorAll("span")) {
      if (span.innerText.includes(searchValue) || searchValue == "") {
        span.setAttribute("visible", "true");
        show = true;
      } else {
        span.setAttribute("visible", "false");
      }
    }
    if (show) {
      article.setAttribute("visible", "true");
    } else {
      article.setAttribute("visible", "false");
    }
  }
}
function sortSpansInElement(el) {
  const spans = Array.from(el.getElementsByTagName("span"));
  spans.sort((a, b) => a.textContent.localeCompare(b.textContent));
  el.innerHTML = "";
  spans.forEach((span) => el.appendChild(span));
}

/* REALTIME */
async function sendBroadcast(event, payload) {
  await supabase.channel("realtime_broadcasts").send({
    type: "broadcast",
    event,
    payload,
  });
}
function realtimeDeleteAllRecieved() {
  document.querySelectorAll(".collection").forEach((el) => el.remove());
  document.querySelectorAll(".search-collection").forEach((el) => el.remove());
  updatePercentPossesed();
  if (docID("deleationconfrimation").getAttribute("open") == "true") {
    closeModal("deleationconfrimation");
  }
  if (docID("edit-add-collection").getAttribute("open") == "true" && editing) {
    closeModal("edit-add-collection");
  }
  showNotification("All collections deleted");
}
function realtimeDeleteRecieved(payload) {
  const collection_name = payload.collection_name;
  docID("collection-" + collection_name).remove();
  docID("search-collection-" + collection_name)?.remove();
  updatePercentPossesed();
  if (
    docID("deleationconfrimation").getAttribute("open") == "true" &&
    docID("collection-delete-name").innerText == collection_name
  ) {
    closeModal("deleationconfrimation");
  }
  if (
    docID("edit-add-collection").getAttribute("open") == "true" &&
    editing == collection_name
  ) {
    closeModal("edit-add-collection");
  }
  showNotification(`Collection ${collection_name} was deleted`);
}
function realtimeUpdateRecieved(payload) {
  let old_collection_name = payload.old_collection_name;
  let row = payload.row;
  const article = docID("collection-" + old_collection_name);
  article.id = "collection-" + row.collection_name;
  article.style.setProperty(
    "--highlight-color",
    `var(--pico-color-${row.colour}-500)`
  );
  article.setAttribute("collection", row.collection_name);
  article.querySelector("h1").innerText = row.collection_name;
  article.querySelector(
    ".cardlist:not(.possessedDiv)"
  ).innerHTML = `${row.unpossessed_cards
    .map(
      (x) =>
        `<span onclick="changePossession(this,true)">☐ ${HTMLEscape(x)}</span>`
    )
    .join("")}`;
  article.querySelector(
    ".cardlist.possessedDiv"
  ).innerHTML = `${row.possessed_cards
    .map(
      (x) =>
        `<span onclick="changePossession(this,false)">☑ ${HTMLEscape(x)}</span>`
    )
    .join("")}`;
  // If search is open, update it
  if (docID("search-modal").getAttribute("open") == "true") {
    console.log("search-collection-" + old_collection_name);
    const searchArticle = docID("search-collection-" + old_collection_name);
    searchArticle.id = "search-collection-" + row.collection_name;
    searchArticle.style.setProperty(
      "--highlight-color",
      `var(--pico-color-${row.colour}-500)`
    );
    searchArticle.setAttribute("collection", row.collection_name);
    searchArticle.querySelector("h3").innerText = row.collection_name;
    searchArticle.querySelector(
      ".cardlist:not(.possessedDiv)"
    ).innerHTML = `${row.unpossessed_cards
      .map(
        (x) =>
          `<span onclick="changePossession(this,true)">☐ ${HTMLEscape(
            x
          )}</span>`
      )
      .join("")}`;
    searchArticle.querySelector(
      ".cardlist.possessedDiv"
    ).innerHTML = `${row.possessed_cards
      .map(
        (x) =>
          `<span onclick="changePossession(this,false)">☑ ${HTMLEscape(
            x
          )}</span>`
      )
      .join("")}`;
    updateSearchResults();
  }
  if (
    docID("deleationconfrimation").getAttribute("open") == "true" &&
    docID("collection-delete-name").innerText == old_collection_name
  ) {
    closeModal("deleationconfrimation");
    showNotification(`Collection ${old_collection_name} was updated`);
  }
  if (
    docID("edit-add-collection").getAttribute("open") == "true" &&
    editing == old_collection_name
  ) {
    closeModal("edit-add-collection");
    showNotification(`Collection ${old_collection_name} was updated`);
  }
  updatePercentPossesed();
}
async function realtimeSwapRecieved(payload) {
  const collection_name = payload.collection_name;
  const cardName = payload.cardName;
  const switchToPossessing = payload.switchToPossessing;
  const textContent = payload.textContent;
  let removeFromQuery;
  let addToQuery;
  let newSymbol;
  if (switchToPossessing) {
    removeFromQuery = ".cardlist:not(.possessedDiv)";
    addToQuery = ".cardlist.possessedDiv";
    newSymbol = "☑";
  } else {
    removeFromQuery = ".cardlist.possessedDiv";
    addToQuery = ".cardlist:not(.possessedDiv)";
    newSymbol = "☐";
  }
  // Swap in collections
  const spans = docID(`collection-${collection_name}`).querySelectorAll(
    removeFromQuery + " span"
  );
  const loadingSpan = Array.from(spans).find(
    (span) => span.getAttribute("aria-busy") === "true"
  );
  if (loadingSpan) {
    loadingSpan.remove();
  } else {
    Array.from(spans)
      .find((span) => span.textContent === textContent)
      .remove();
  }

  const addToCollection = docID(`collection-${collection_name}`).querySelector(
    addToQuery
  );
  addToCollection.innerHTML += `<span onclick="changePossession(this,${!switchToPossessing})">${
    newSymbol + " " + HTMLEscape(cardName)
  }</span>`;
  sortSpansInElement(addToCollection);
  // Swap in search
  if (docID("search-modal").getAttribute("open") == "true") {
    const searchSpans = docID(
      `search-collection-${collection_name}`
    ).querySelectorAll(removeFromQuery + " span");
    const loadingSearchSpan = Array.from(searchSpans).find(
      (span) => span.getAttribute("aria-busy") === "true"
    );
    if (loadingSearchSpan) {
      loadingSearchSpan.remove();
    } else {
      Array.from(searchSpans)
        .find((span) => span.textContent === textContent)
        .remove();
    }
    const addToSearchCollection = docID(
      `search-collection-${collection_name}`
    ).querySelector(addToQuery);
    addToSearchCollection.innerHTML += `<span onclick="changePossession(this,${!switchToPossessing})">${
      newSymbol + " " + HTMLEscape(cardName)
    }</span>`;
    sortSpansInElement(addToSearchCollection);
    updateSearchResults();
  }
  if (
    docID("edit-add-collection").getAttribute("open") == "true" &&
    editing == collection_name
  ) {
    closeModal("edit-add-collection");
    showNotification(`The card ${cardName} was swaped in ${collection_name}`);
  }
  updatePercentPossesed();
}
function realtimeNewRecieved(payload) {
  createCollectionElement(payload);
  createSearchCollectionElement(payload, true);
  updateSearchResults();
  updatePercentPossesed();
}
function showNotification(message) {
  let card = document.createElement("card");
  card.classList.add("notification");
  card.innerText = message;
  docID("notifications").appendChild(card);
  setTimeout(() => card.remove(), 4500);
}

/* NOTE TAKING */
async function openNoteModal(el) {
  const { data, error } = await supabase.from("notes").select();
  docID("notes").innerHTML = "";
  data.sort((a, b) => a.id - b.id).forEach((row) => createNoteHTML(row));
  openModal("note-modal", el);
}
async function createNewNote(el) {
  el.setAttribute("aria-busy", "true");
  const { error } = await supabase.from("notes").insert({});
  const { data, error2 } = await supabase.from("notes").select();
  await sendBroadcast("new-note", data.sort((a, b) => a.id - b.id).pop());
  el.setAttribute("aria-busy", "false");
}
function createNoteHTML(row) {
  docID("notes").innerHTML += `<div class="note" id="note-${row.id}">
 <div class="note-content" contenteditable="true" onkeyup="updateNote(this)">
     ${HTMLEscape(row.content)}
 </div>
 <div class="menu-button save-note-button" onclick="saveNote(this)" visible="false">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
</div>
<div class="menu-button revert-note-button" onclick="revertNote(this)" visible="false">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
</div>
 <div class="menu-button" onclick=deleteNote(this)>
     <svg
     xmlns="http://www.w3.org/2000/svg"
     width="24"
     height="24"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="2"
     stroke-linecap="round"
     stroke-linejoin="round"
     class="lucide lucide-trash-2"
   >
     <path d="M3 6h18" />
     <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
     <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
     <line x1="10" x2="10" y1="11" y2="17" />
     <line x1="14" x2="14" y1="11" y2="17" />
   </svg>
 </div>
</div>`;
}
async function deleteNote(el) {
  el.setAttribute("aria-busy", "true");
  const id = el.parentElement.id.replace("note-", "");
  const response = await supabase.from("notes").delete().eq("id", id);
  await sendBroadcast("delete-note", { id: el.parentElement.id });
}

async function updateNote(el) {
  el.parentElement
    .querySelector(".save-note-button")
    .setAttribute("visible", "true");
  el.parentElement
    .querySelector(".revert-note-button")
    .setAttribute("visible", "true");
}
async function saveNote(el) {
  el.setAttribute("aria-busy", "true");
  const id = el.parentElement.id.replace("note-", "");
  const content = el.parentElement.querySelector(".note-content").innerText;
  const { error } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", id);
  el.parentElement
    .querySelector(".save-note-button")
    .setAttribute("visible", "false");
  el.parentElement
    .querySelector(".revert-note-button")
    .setAttribute("visible", "false");
    await sendBroadcast("save-note", { id, content });
  el.setAttribute("aria-busy", "false");
  
}
async function revertNote(el) {
  el.setAttribute("aria-busy", "true");
  const id = el.parentElement.id.replace("note-", "");
  const { data, error } = await supabase.from("notes").select().eq("id", id);
  el.parentElement
    .querySelector(".save-note-button")
    .setAttribute("visible", "false");
  el.parentElement
    .querySelector(".revert-note-button")
    .setAttribute("visible", "false");
  el.parentElement.querySelector(".note-content").innerText = data[0].content;
  el.setAttribute("aria-busy", "false");
}
function closeNoteModal(el) {
    if(el) { el.setAttribute("aria-busy", "true"); }
    const isEditing = docID("note-modal").querySelector("[visible='true']");
    if(isEditing) {
        showNoteNotification("Please save your notes before closing")
    } else {
        closeModal("note-modal")
    }
    if(el) { el.setAttribute("aria-busy", "false"); }
}
function realtimeNewNoteRecieved(payload) {
  if (docID("note-modal").getAttribute("open") == "true") {
    createNoteHTML(payload);
  }
}
function realtimeDeleteNoteRecieved(payload) {
  if (docID("note-modal").getAttribute("open") == "true") {
    docID(payload.id).remove();
  }
}
function realtimeSaveNoteRecieved(payload) {
  if (docID("note-modal").getAttribute("open") == "true") {
    const noteContentEl = docID("note-" + payload.id).querySelector(
      ".note-content"
    );
    const isEditing = docID("note-" + payload.id).querySelector("[visible='true']")
    if(isEditing) {
        showNoteNotification("A note that you are editing was updated")
    } else {
        noteContentEl.innerText = payload.content;
    }
  }
}
function showNoteNotification(message) {
    let card = document.createElement("card");
    card.classList.add("notification");
    card.innerText = message;
    docID("note-notifications").appendChild(card);
    setTimeout(() => card.remove(), 4500);
  }

// WHEN ACTIVE OR OPENEING MODLE DISABLE ALL PRECNECE

// Make functions global for html elements like buttons
window.selectcolour = selectcolour;
window.addNewCollection = addNewCollection;
window.checkFormCollectionName = checkFormCollectionName;
window.openEditModal = openEditModal;
window.openDeleteCollectionModal = openDeleteCollectionModal;
window.deleteConfirmed = deleteConfirmed;
window.changePossession = changePossession;
window.openSearchModal = openSearchModal;
window.updateSearchResults = updateSearchResults;
window.openNoteModal = openNoteModal;
window.createNewNote = createNewNote;
window.deleteNote = deleteNote;
window.updateNote = updateNote;
window.saveNote = saveNote;
window.revertNote = revertNote;
window.closeNoteModal = closeNoteModal;