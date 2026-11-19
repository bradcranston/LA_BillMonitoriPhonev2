import "@shoelace-style/shoelace/dist/themes/light.css";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/rating/rating.js";
import "@shoelace-style/shoelace/dist/components/button-group/button-group.js";
import "@shoelace-style/shoelace/dist/components/tag/tag.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";
import "@shoelace-style/shoelace/dist/components/checkbox/checkbox.js";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";

// Set the base path to the folder you copied Shoelace's assets to
setBasePath("/path/to/shoelace/dist");

window.loadData = (json) => {
  const data = JSON.parse(json);

  // Sort data by bmh_date initially
  data.sort((a, b) => {
    const dateA = new Date(a.fieldData.bmh_date);
    const dateB = new Date(b.fieldData.bmh_date);
    if (!dateA.getTime() && !dateB.getTime()) {
      return 0;
    } else if (!dateA.getTime()) {
      return 1;
    } else if (!dateB.getTime()) {
      return -1;
    } else {
      return dateB - dateA;
    }
  });

  data.forEach(function (row, index) {
    row.fieldData.index = index;
  });

  function sortByCategory(data) {
    return data.sort((a, b) => {
      const categoryA = a.fieldData.category || ""; // Default to empty string if no category
      const categoryB = b.fieldData.category || ""; // Default to empty string if no category

      if (!categoryA && categoryB) return 1; // Move empty categories to the end
      if (categoryA && !categoryB) return -1; // Keep non-empty categories before empty ones
      if (categoryA < categoryB) return -1; // Sort alphabetically
      if (categoryA > categoryB) return 1;
      return 0; // Maintain order if equal
    });
  }

  // Function to sort by numeric part of BillNumber
  function sortByBillNumber(data) {
    return data.sort((a, b) => {
      const numA = parseInt(a.fieldData.number.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.fieldData.number.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }

  // Function to sort by bmh_date in descending order (MM/DD/YYYY format)
  function sortBybmh_date(data) {
    return data.sort((a, b) => {
      const [monthA, dayA, yearA] = a.fieldData.bmh_date.split("/").map(Number);
      const [monthB, dayB, yearB] = b.fieldData.bmh_date.split("/").map(Number);

      const dateA = new Date(yearA, monthA - 1, dayA); // JavaScript months are 0-based
      const dateB = new Date(yearB, monthB - 1, dayB);

      return dateB - dateA; // Descending order
    });
  }

  // New function to filter by GoodBad value
  function filterByGoodBad(data, goodBadValue) {
    return goodBadValue
      ? data.filter((item) => item.fieldData.goodbad === goodBadValue)
      : data;
  }

  function filterByAliveDead(data, aliveDeadValue) {
    if (aliveDeadValue === "Dead") {
      return data.filter(
        (item) => item.fieldData.Progress === "Dead for the Session"
      );
    } else if (aliveDeadValue === "Alive") {
      return data.filter(
        (item) => item.fieldData.Progress !== "Dead for the Session"
      );
    } else {
      return data; // "Alive Dead" shows all
    }
  }

  function filterByYear(data, yearValue) {
    return yearValue
      ? data.filter((item) => 
        JSON.stringify(item.fieldData.bmh_date_year) === yearValue)
      : data;
  }

  // Filter by search input
  function filterBySearch(data, searchValue) {
    return searchValue
      ? data.filter((item) => {
          const rowData = item.fieldData;
          return Object.values(rowData).some(
            (value) =>
              typeof value === "string" &&
              value.toLowerCase().includes(searchValue.toLowerCase())
          );
        })
      : data;
  }

  // Combine all filters (GoodBad, year, and search)
  function applyFilters(
    data,
    goodBadValue,
    yearValue,
    searchValue,
    aliveDeadValue
  ) {
    let filteredData = filterByGoodBad(data, goodBadValue);
    filteredData = filterByYear(filteredData, yearValue);
    filteredData = filterBySearch(filteredData, searchValue);
    filteredData = filterByAliveDead(filteredData, aliveDeadValue);
    return filteredData;
  }

  console.log(data.map((item) => item.fieldData.bmh_date_year));

  // Function to create table body with filters
  function createTableBody(
    data,
    goodBadValue,
    yearValue,
    searchValue,
    sortByCategoryFlag,
    sortByBillNumberFlag,
    sortBybmh_dateFlag,
    aliveDeadValue
  ) {
    let filteredData = applyFilters(
      data,
      goodBadValue,
      yearValue,
      searchValue,
      aliveDeadValue
    );

    if (sortByCategoryFlag || sortBybmh_dateFlag) {
      // Group related records together based on billLink
      filteredData.sort((a, b) => {
        const linkA = a.fieldData.billLink || a.fieldData._ID;
        const linkB = b.fieldData.billLink || b.fieldData._ID;
        if (linkA < linkB) return -1;
        if (linkA > linkB) return 1;
        return 0;
      });
    }

    if (sortByCategoryFlag) {
      filteredData = sortByCategory(filteredData);
    }

    if (sortByBillNumberFlag) {
      filteredData = sortByBillNumber(filteredData);
    }

    if (sortBybmh_dateFlag) {
      filteredData = sortBybmh_date(filteredData);
    }

    const tbody = document.createElement("tbody");
    // Update the result count
    resultCount.textContent = `${filteredData.length} records`;
    let currentCategory = "";
    let uncategorizedHeaderAdded = false; // Track if 'Uncategorized' header has been added
    let lastGroupID = null;

    for (const item of filteredData) {
      const rowData = item.fieldData;
      const currentGroupID = rowData._ID; // The ID of the current record

      // Check if this record is linked to the last record
      const isLinked = rowData.billLink === lastGroupID;

      // Handle category header creation
      if (sortByCategoryFlag) {
        if (!rowData.category) {
          // Add 'Uncategorized' header only once
          if (!uncategorizedHeaderAdded) {
            uncategorizedHeaderAdded = true;
            const categoryRow = document.createElement("tr");
            const categoryCell = document.createElement("td");
            categoryCell.colSpan = 4;
            categoryCell.className = "category-header";
            categoryCell.textContent = "Uncategorized";
            categoryRow.appendChild(categoryCell);
            tbody.appendChild(categoryRow);
          }
        } else if (rowData.category !== currentCategory) {
          // Add header for new category
          currentCategory = rowData.category;
          const categoryRow = document.createElement("tr");
          const categoryCell = document.createElement("td");
          categoryCell.colSpan = 4;
          categoryCell.className = "category-header";
          categoryCell.textContent = currentCategory;
          categoryRow.appendChild(categoryCell);
          tbody.appendChild(categoryRow);
        }
      }

      const row = document.createElement("tr");
      row.setAttribute("data-index", item.fieldData.index); // Add data-index attribute
      row.setAttribute("id", rowData._ID);

      // Create the row container
      const row1 = document.createElement("div");
      row1.className = "row1";

      // Determine the flag icon class
      let flagClass = "gray-flag"; // Default
      if (rowData.goodbad === "Good" && rowData.flag === "1") {
        flagClass = "green-flag";
      } else if (rowData.goodbad === "Bad" && rowData.flag === "1") {
        flagClass = "red-flag";
      }

      // Determine the number text class
      let numberTextClass = "gray"; // Default
      if (rowData.goodbad === "Good") {
        numberTextClass = "green";
      } else if (rowData.goodbad === "Bad") {
        numberTextClass = "red";
      }

      // Create the flag icon
      const flagIcon = document.createElement("span");
      flagIcon.className = `icon ${flagClass} fa-solid fa-flag flag-icon`;

      // Create the state text node
      const stateText = document.createElement("span");
      stateText.innerText = rowData.state + " ";
      stateText.className = "stateText";

      // Create the number text node
      const numberText = document.createElement("span");
      numberText.innerText = rowData.number;
      numberText.className = numberTextClass;

      // Create a container for stateText and numberText
      const leftContainer = document.createElement("div");
      leftContainer.className = "left-container";

      // Append stateText and numberText to the left container
      leftContainer.appendChild(stateText);
      leftContainer.appendChild(numberText);

      // Add chain link icon if the record has a related record
      if (rowData.billLink) {
        const chainLinkIcon = document.createElement("span");
        chainLinkIcon.className = "icon fa-solid fa-link chain-link-icon";
        chainLinkIcon.style.color = "green";
        leftContainer.appendChild(chainLinkIcon);
      }

      // Create the page icon with a click event
      const pageIcon = document.createElement("span");
      pageIcon.className = "icon fa-solid fa-file page-icon";
      pageIcon.style.cursor = "pointer"; // Make the cursor a pointer to indicate clickability

      // Add click event listener
      pageIcon.onclick = () => {
        runScriptBillText(rowData._ID);
      };

      // Create the page icon with a click event
      const buttonSHV = document.createElement("span");
      buttonSHV.className = "icon fa-solid fa-circle-info page-icon";
      buttonSHV.style.cursor = "pointer"; // Make the cursor a pointer to indicate clickability

      // Add click event listener
      buttonSHV.onclick = () => {
        runScriptSHV(rowData._ID);
      };

      // Create the page icon with a click event
      const buttonWebsite = document.createElement("span");
      buttonWebsite.className = "icon fa-solid fa-globe page-icon";
      buttonWebsite.style.cursor = "pointer"; // Make the cursor a pointer to indicate clickability

      // Add click event listener
      buttonWebsite.onclick = () => {
        runScriptWebsite(rowData._ID);
      };

      // Create a flex container for the icons
      const iconContainer = document.createElement("div");
      iconContainer.className = "icon-container";

      // Append the icons to the icon container
      iconContainer.appendChild(flagIcon);
      iconContainer.appendChild(pageIcon);
      iconContainer.appendChild(buttonSHV);
      iconContainer.appendChild(buttonWebsite);

      // Create a container for LastAction elements
      const lastActionContainer = document.createElement("div");
      lastActionContainer.className = "lastActionContainer";

      // Create the LastAction label span
      const lastActionLabel = document.createElement("span");
      lastActionLabel.className = "lastActionLabel";
      lastActionLabel.innerText = "Last Action";

      // Create the LastActionDateSpan
const LastActionDateSpan = document.createElement("span");
LastActionDateSpan.className = "LastActionDate";
const LastActionDate = document.createTextNode(rowData.bmh_date);
LastActionDateSpan.appendChild(LastActionDate);

// Highlight with orange background if within the last two days
if (rowData.bmh_date) {
  const [month, day, year] = rowData.bmh_date.split("/").map(Number);
  const bmhDate = new Date(year, month - 1, day); // JavaScript months are 0-based
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  if (bmhDate >= twoDaysAgo && bmhDate <= today) {
    LastActionDateSpan.style.backgroundColor = "orange";
  }

  // Add blue dot if within the last seven days
  if (bmhDate >= sevenDaysAgo && bmhDate <= today) {
    const blueDot = document.createElement("span");
    blueDot.style.display = "inline-block";
    blueDot.style.width = "8px";
    blueDot.style.height = "8px";
    blueDot.style.backgroundColor = "blue";
    blueDot.style.borderRadius = "50%";
    blueDot.style.marginLeft = "5px"; // Space between label and dot
    lastActionLabel.appendChild(blueDot);
  }
}

      // Append the label and date to the lastActionContainer
      lastActionContainer.appendChild(lastActionLabel);
      lastActionContainer.appendChild(LastActionDateSpan);

      // Append elements to the row
      row1.appendChild(flagIcon);
      row1.appendChild(leftContainer);
      row1.appendChild(iconContainer);
      row1.appendChild(lastActionContainer); // Append the container with LastAction spans

      const row2 = document.createElement("div");
      const row2span = document.createElement("div");
      row2span.className = "row2span";
      row2.className = "row2";
      const OurBillTitle = document.createTextNode(rowData.OurBillTitle);
      row2span.appendChild(OurBillTitle);
      row2.appendChild(row2span);

      const row3 = document.createElement("div");
      row3.className = "row3";

      const headerMostRecentDiv = document.createElement("div");
      const headerMostRecentSpan = document.createElement("span");
      headerMostRecentSpan.className = "headerSpan";
      const headerMostRecent = document.createTextNode("Last Action");
      headerMostRecentSpan.appendChild(headerMostRecent);
      headerMostRecentDiv.appendChild(headerMostRecentSpan);

      const mostRecentDiv = document.createElement("div");
      const mostRecent = document.createTextNode(
        rowData.bmh_action + " - " + rowData.bmh_date
      );
      mostRecentDiv.className = "text";
      mostRecentDiv.appendChild(mostRecent);
      row3.appendChild(headerMostRecentDiv);
      row3.appendChild(mostRecentDiv);

      const row4 = document.createElement("div");
      row4.className = "row3";
      const headerCategoryDiv = document.createElement("div");
      const headerCategorySpan = document.createElement("span");
      headerCategorySpan.className = "headerSpan";
      const headerCategory = document.createTextNode("Category");
      headerCategorySpan.appendChild(headerCategory);
      headerCategoryDiv.appendChild(headerCategorySpan);

      const categoryDiv = document.createElement("div");
      const category = document.createTextNode(rowData.category);
      categoryDiv.className = "text";
      categoryDiv.appendChild(category);
      row4.appendChild(headerCategoryDiv);
      row4.appendChild(categoryDiv);

      const row5 = document.createElement("div");
      row5.className = "row3";
      const headerProgressDiv = document.createElement("div");
      const headerProgressSpan = document.createElement("span");
      headerProgressSpan.className = "headerSpan";
      const headerProgress = document.createTextNode("Progress");
      headerProgressSpan.appendChild(headerProgress);
      headerProgressDiv.appendChild(headerProgressSpan);

      const progressDiv = document.createElement("div");
      const progress = document.createTextNode(rowData.Progress);
      progressDiv.className = "text";
      progressDiv.appendChild(progress);
      row5.appendChild(headerProgressDiv);
      row5.appendChild(progressDiv);

      const row6 = document.createElement("div");
      row6.className = "row3";

      const headerVotesDiv = document.createElement("div");
      const headerVotesSpan = document.createElement("span");
      headerVotesSpan.className = "headerSpan";
      const headerVotes = document.createTextNode("Votes");
      headerVotesSpan.appendChild(headerVotes);
      headerVotesDiv.appendChild(headerVotesSpan);

      // Convert the HTML string to a DOM node
      const tagsWrapper = document.createElement("div");
      tagsWrapper.innerHTML = generateTags(
        rowData.PassedHouse,
        rowData.PassedSenate,
        rowData.SignedbyGovernor
      );

      // Create the button
      const buttonRollCalls = document.createElement("sl-button");
      buttonRollCalls.setAttribute("size", "medium");
      buttonRollCalls.setAttribute("variant", "primary");
      buttonRollCalls.setAttribute("outline", "");
      buttonRollCalls.setAttribute(
        "onclick",
        `runScriptRollCall('${rowData._ID}')`
      );
      buttonRollCalls.textContent = "Roll Call";

      const row6container = document.createElement("div");
      row6container.className = "row6-container"; // Add a class for styling
      row6container.appendChild(tagsWrapper);
      row6container.appendChild(buttonRollCalls);

      row6.appendChild(headerVotesDiv);
      // Append the tags and button to row8
      row6.appendChild(row6container);

      // Create the checkbox element
      const checkbox = document.createElement("sl-checkbox");
      checkbox.setAttribute("size", "large");
      checkbox.checked = rowData.emailcheckbox === "1";
      checkbox.disabled = true;
      checkbox.className = "checkbox";

      const row7 = document.createElement("div");
      row7.className = "row3";
      const headerEmailWebDiv = document.createElement("div");
      const headerEmailWebSpan = document.createElement("span");
      headerEmailWebSpan.className = "headerSpan";
      const headerEmailWeb = document.createTextNode("Email/Web");
      headerEmailWebSpan.appendChild(headerEmailWeb);
      headerEmailWebSpan.appendChild(checkbox);
      headerEmailWebDiv.appendChild(headerEmailWebSpan);

      const emailWebDiv = document.createElement("div");
      const emailWeb = document.createTextNode(rowData.emailDescription);
      emailWebDiv.className = "text";
      emailWebDiv.appendChild(emailWeb);
      row7.appendChild(headerEmailWebDiv);
      row7.appendChild(emailWebDiv);

      const row8 = document.createElement("div");
      row8.className = "row3";
      const headerNotesDiv = document.createElement("div");
      const headerNotesSpan = document.createElement("span");
      headerNotesSpan.className = "headerSpan";
      const headerNotes = document.createTextNode("Notes");
      headerNotesSpan.appendChild(headerNotes);
      headerNotesDiv.appendChild(headerNotesSpan);

      const notesDiv = document.createElement("div");
      const notes = document.createTextNode(rowData.BillMonitorNotes);
      notesDiv.className = "text";
      notesDiv.appendChild(notes);
      row8.appendChild(headerNotesDiv);
      row8.appendChild(notesDiv);

      // Create row11 container
      const row9 = document.createElement("div");
      row9.className = "lastReviewed"; // Add a class for potential styling

      // Create the email description text node
      const lastReviewed = document.createElement("span");
      lastReviewed.textContent = "Last Reviewed: " + rowData.LastReviewDate;

      // Append elements to row9
      row9.appendChild(lastReviewed);

      const card = document.createElement("sl-card");
      card.classList.add("card");

      // Append the div to the container
      const divider = document.createElement("div");

      // Add a lighter gray divider if this row starts a new group
      if (lastGroupID === null || !isLinked) {
        divider.style.height = "10px";
        divider.style.marginBottom = "3px";
        divider.style.backgroundColor = "#555"; // Dark gray color
      } else {
        divider.style.height = "10px";
        divider.style.marginBottom = "3px";
        divider.style.backgroundColor = "#bbb"; // Dark gray color
      }

      card.appendChild(divider);
      card.appendChild(row1);
      card.appendChild(row2);
      card.appendChild(row3);
      card.appendChild(row4);
      card.appendChild(row5);
      card.appendChild(row6);
      card.appendChild(row7);
      card.appendChild(row8);
      card.appendChild(row9);

      row.appendChild(card);
      tbody.appendChild(row);

      lastGroupID = currentGroupID; // Update lastGroupID to the current record's ID
    }
    //alert(window.innerWidth);

    return tbody;
  }

  function generateTags(house, senate, signed) {
    let html = "";
    if (house) {
      html += `<sl-tag size="large" variant="success">House</sl-tag>\n`;
    } else {
      html += `<sl-tag size="large" variant="neutral">House</sl-tag>\n`;
    }
    if (senate) {
      html += `<sl-tag size="large" variant="success">Senate</sl-tag>\n`;
    } else {
      html += `<sl-tag size="large" variant="neutral">Senate</sl-tag>\n`;
    }
    if (signed) {
      html += `<sl-tag size="large" variant="success">Signed</sl-tag>\n`;
    } else {
      html += `<sl-tag size="large" variant="neutral">Signed</sl-tag>\n`;
    }
    return html.trim();
  }

  // Create table container
  const tableContainer = document.createElement("div");
  tableContainer.style.overflow = "auto"; // Make the container scrollable
  tableContainer.style.display = "flex";
  tableContainer.style.flexDirection = "column";
  tableContainer.style.alignItems = "center"; // Center children horizontally
  document.body.appendChild(tableContainer);

  // Create search input field
  const searchInput = document.createElement("input");
  searchInput.setAttribute("type", "text");
  searchInput.className = "inputSearch";
  searchInput.setAttribute("placeholder", "Search...");

  // Optional: Style the input for better appearance
  searchInput.style.fontSize = "1.3em";
  searchInput.style.textAlign = "center"; // Center text within the input field

  tableContainer.insertBefore(searchInput, tableContainer.firstChild);

  function createDivider() {
    return document.createElement("sl-divider");
  }

  const sortDiv = document.createElement("div");

  sortDiv.className = "center-select"; // Add class to select container

  // Create button to sort by bmh_date
  const sortBybmh_dateButton = document.createElement("button");
  sortBybmh_dateButton.className = "sort-button active"; // Active by default
  sortBybmh_dateButton.textContent = "Sort by Date";
  sortDiv.append(sortBybmh_dateButton);

  // Create button to sort by Category
  const sortByCategoryButton = document.createElement("button");
  sortByCategoryButton.className = "sort-button";
  sortByCategoryButton.textContent = "Sort by Category";
  sortDiv.append(sortByCategoryButton);

  // Create button to sort by Bill Number
  const sortByBillNumberButton = document.createElement("button");
  sortByBillNumberButton.className = "sort-button";
  sortByBillNumberButton.textContent = "Sort by Bill Number";
  sortDiv.append(sortByBillNumberButton);

  tableContainer.insertBefore(sortDiv, searchInput);

  const filterDiv = document.createElement("div");

  filterDiv.className = "center-select"; // Add class to select container

  // Create filter select for GoodBad with "All Good/Bad"
  const filterSelectGoodBad = document.createElement("select");
  filterSelectGoodBad.className = "buttonFilter";
  filterSelectGoodBad.innerHTML = `
    <option value="">Good/Bad</option>
    <option value="Good">Good</option>
    <option value="Bad">Bad</option>
  `;

  filterDiv.append(filterSelectGoodBad);

  // Create filter select for Alive/Dead
  const filterSelectAliveDead = document.createElement("select");
  filterSelectAliveDead.className = "buttonFilter";
  filterSelectAliveDead.innerHTML = `
  <option value="Alive">Alive</option>
  <option value="Dead">Dead</option>
  <option value="AliveDead">Alive/Dead</option>
`;

  // Append the new filter before the existing filters
  filterDiv.insertBefore(filterSelectAliveDead, filterSelectGoodBad);

  // Create filter select for Year
  const filterSelectYear = document.createElement("select");
  filterSelectYear.className = "buttonFilter";

  const uniqueYears = [
    ...new Set(data.map((item) => item.fieldData.bmh_date_year)),
  ].filter((year) => year); // Filter out any undefined or null values

  filterSelectYear.innerHTML = `<option value="">All Years</option>`;
  uniqueYears.forEach((year) => {
    filterSelectYear.innerHTML += `<option value="${year}">${year}</option>`;
  });
  filterDiv.insertBefore(filterSelectYear, filterSelectGoodBad);

  const currentYear = new Date().getFullYear().toString();

  // Get the current year

  tableContainer.insertBefore(filterDiv, sortDiv);

  // Set the default value if the current year is in the dropdown options
  if (
    [...filterSelectYear.options].some((option) => option.value === currentYear)
  ) {
    filterSelectYear.value = currentYear;
  }

  const searchContainer = document.createElement("div");
  searchContainer.style.display = "flex";
  searchContainer.style.alignItems = "center";
  searchContainer.style.justifyContent = "center"; // Align elements to the left
  searchContainer.style.gap = "10px"; // Space between the search input and the found count
  searchContainer.style.width = "100%";
  searchContainer.style.boxSizing = "border-box"; // Ensure padding is included in the width

  const resultCount = document.createElement("span");
  resultCount.className = "resultCount";
  resultCount.textContent = "0 records";
  resultCount.style.marginLeft = "0px"; // Space between search bar and found count
  resultCount.style.whiteSpace = "nowrap";

  searchInput.style.flex = "0 1 300px"; // Allow the input to shrink/grow but cap at 300px
  searchInput.style.fontSize = "1.3em";
  searchInput.style.width = "100%";
  searchInput.style.maxWidth = "300px";
  searchInput.style.marginRight = "10px"; // Space between the input and the result count
  resultCount.style.whiteSpace = "nowrap";

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(resultCount);

  // Insert the container below the filters
  tableContainer.insertBefore(searchContainer, sortDiv.nextSibling);

  // Create table
  const table = document.createElement("table");
  table.appendChild(
    createTableBody(
      data,
      filterSelectGoodBad.value,
      filterSelectYear.value,
      searchInput.value,
      sortByCategoryButton.classList.contains("active"),
      sortByBillNumberButton.classList.contains("active"),
      sortBybmh_dateButton.classList.contains("active"),
      filterSelectAliveDead.value // Add this parameter,
    )
  );
  tableContainer.appendChild(table);

  filterSelectAliveDead.value = "Alive";

  // Event listener for search input
  searchInput.addEventListener("input", function () {
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        sortByCategoryButton.classList.contains("active"),
        sortByBillNumberButton.classList.contains("active"),
        sortBybmh_dateButton.classList.contains("active"),
        filterSelectAliveDead.value // Add this new parameter
      )
    );
  });

  function highlightButton(activeButton) {
    const buttons = [
      sortByCategoryButton,
      sortByBillNumberButton,
      sortBybmh_dateButton,
    ];
    buttons.forEach((button) => button.classList.remove("active"));
    activeButton.classList.add("active");
  }

  // Event listener for GoodBad filter
  filterSelectGoodBad.addEventListener("change", function () {
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        false,
        false,
        false,
        filterSelectAliveDead.value // Add this new parameter
      )
    );
  });

  filterSelectAliveDead.addEventListener("change", function () {
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        sortByCategoryButton.classList.contains("active"),
        sortByBillNumberButton.classList.contains("active"),
        sortBybmh_dateButton.classList.contains("active"),
        filterSelectAliveDead.value // Pass the current Alive/Dead filter value
      )
    );
  });

  // Event listener for Year filter
  filterSelectYear.addEventListener("change", function () {
    console.log("Year filter changed to:", filterSelectYear.value);
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        false,
        false,
        false,
        filterSelectAliveDead.value
      )
    );
  });

  sortByCategoryButton.addEventListener("click", function () {
    highlightButton(sortByCategoryButton);
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        true,
        false,
        false,
        filterSelectAliveDead.value // Add this new parameter
      )
    );
  });

  sortByBillNumberButton.addEventListener("click", function () {
    highlightButton(sortByBillNumberButton);
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        false,
        true,
        false,
        filterSelectAliveDead.value // Add this new parameter
      )
    );
  });

  sortBybmh_dateButton.addEventListener("click", function () {
    highlightButton(sortBybmh_dateButton);
    table.removeChild(table.getElementsByTagName("tbody")[0]);
    table.appendChild(
      createTableBody(
        data,
        filterSelectGoodBad.value,
        filterSelectYear.value,
        searchInput.value,
        false,
        false,
        true,
        filterSelectAliveDead.value // Add this new parameter
      )
    );
  });

  // Automatically trigger the change event to apply the default filter
  filterSelectYear.dispatchEvent(new Event("change"));

  runScriptBillText = function (param) {
    const build = {
      mode: "billText",
      id: param,
    };

    FileMaker.PerformScriptWithOption(
      "wv Bill Monitor iPhone trigger",
      JSON.stringify(build),
      0
    );
  };


  runScriptSHV = function (param) {
    const build = {
      mode: "billSHV",
      id: param,
    };

    FileMaker.PerformScriptWithOption(
      "wv Bill Monitor iPhone trigger",
      JSON.stringify(build),
      0
    );
  };

  runScriptRollCall = function (param) {
    const build = {
      mode: "billRollCall",
      id: param,
    };

    FileMaker.PerformScriptWithOption(
      "wv Bill Monitor iPhone trigger",
      JSON.stringify(build),
      0
    );
  };

  runScriptWebsite = function (param) {
    const build = {
      mode: "stateWebsite",
      id: param,
    };

    FileMaker.PerformScriptWithOption(
      "wv Bill Monitor iPhone trigger",
      JSON.stringify(build),
      0
    );
  };

  const rows = table.getElementsByTagName("tr");

  for (var i = 0; i < rows.length; i++) {
    rows[i].addEventListener("click", function () {
      // Do something when a row is clicked
      let build = {
        id: this.id,
        action: "goToBill",
      };
      console.log(build);
      callFM(build);
    });
  }
};

window.callFM = function (result) {
  FileMaker.PerformScript("wv_runScript", JSON.stringify(result));
};



