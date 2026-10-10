/**
 * Culinary Scale Pro — Enterprise Recipe Scaling Engine
 * Vanilla JavaScript (ES6+) Implementation
 * 
 * Features:
 * - Strict multi-level input validation (dish name, servings, 3 ingredients)
 * - Precision ratio formula: originalQuantity * (wantedServings / originalServings)
 * - Clean decimal formatting (avoid floating-point IEEE-754 artifacts)
 * - Browser LocalStorage persistence (auto-save inputs & valid result, full restoration on refresh)
 * - Interactive 3D perspective and tactile feedback
 * - Enterprise accessibility (ARIA announcements, keyboard navigation)
 */

(function () {
  "use strict";

  // Storage Keys
  const STORAGE_KEY_INPUTS = "culinary_scaler_inputs_v1";
  const STORAGE_KEY_RESULT = "culinary_scaler_result_v1";

  // DOM Elements
  const form = document.getElementById("recipeForm");
  const scaleBtn = document.getElementById("scaleBtn");
  const resetBtn = document.getElementById("resetBtn");
  const alertBanner = document.getElementById("validationAlert");
  const alertErrorsList = document.getElementById("alertErrorsList");
  const emptyStateCard = document.getElementById("emptyStateCard");
  const resultCard = document.getElementById("resultCard3D");
  const toastNotice = document.getElementById("toastNotice");
  const toastText = document.getElementById("toastText");
  const ratioLiveIndicator = document.getElementById("ratioLiveIndicator");
  const storageIndicator = document.getElementById("storageIndicator");

  // Form Field Elements
  const inputs = {
    dishName: document.getElementById("dishName"),
    originalServings: document.getElementById("originalServings"),
    wantedServings: document.getElementById("wantedServings"),
    ing1Name: document.getElementById("ing1Name"),
    ing1Qty: document.getElementById("ing1Qty"),
    ing1Unit: document.getElementById("ing1Unit"),
    ing2Name: document.getElementById("ing2Name"),
    ing2Qty: document.getElementById("ing2Qty"),
    ing2Unit: document.getElementById("ing2Unit"),
    ing3Name: document.getElementById("ing3Name"),
    ing3Qty: document.getElementById("ing3Qty"),
    ing3Unit: document.getElementById("ing3Unit"),
  };

  // Result Display Elements
  const resultElements = {
    dishName: document.getElementById("resDishName"),
    originalServings: document.getElementById("resOrigServings"),
    wantedServings: document.getElementById("resWantedServings"),
    ratioMultiplier: document.getElementById("resRatioMultiplier"),
    formulaNote: document.getElementById("resFormulaNote"),
    timestamp: document.getElementById("resTimestamp"),
    // Ingredient 1
    ing1Name: document.getElementById("resIng1Name"),
    ing1Base: document.getElementById("resIng1Base"),
    ing1Val: document.getElementById("resIng1Val"),
    ing1Unit: document.getElementById("resIng1Unit"),
    // Ingredient 2
    ing2Name: document.getElementById("resIng2Name"),
    ing2Base: document.getElementById("resIng2Base"),
    ing2Val: document.getElementById("resIng2Val"),
    ing2Unit: document.getElementById("resIng2Unit"),
    // Ingredient 3
    ing3Name: document.getElementById("resIng3Name"),
    ing3Base: document.getElementById("resIng3Base"),
    ing3Val: document.getElementById("resIng3Val"),
    ing3Unit: document.getElementById("resIng3Unit"),
  };

  // Preset Recipes for Quick Testing
  const PRESETS = {
    carbonara: {
      dishName: "Classic Roman Carbonara",
      originalServings: 2,
      wantedServings: 6,
      ing1Name: "Spaghetti",
      ing1Qty: 200,
      ing1Unit: "g",
      ing2Name: "Guanciale",
      ing2Qty: 100,
      ing2Unit: "g",
      ing3Name: "Pecorino Romano",
      ing3Qty: 50,
      ing3Unit: "g",
    },
    risotto: {
      dishName: "Truffle Porcini Risotto",
      originalServings: 4,
      wantedServings: 10,
      ing1Name: "Carnaroli Rice",
      ing1Qty: 320,
      ing1Unit: "g",
      ing2Name: "Vegetable Broth",
      ing2Qty: 1.2,
      ing2Unit: "l",
      ing3Name: "Parmigiano Reggiano",
      ing3Qty: 85,
      ing3Unit: "g",
    },
    sourdough: {
      dishName: "Artisan Country Sourdough",
      originalServings: 1,
      wantedServings: 4,
      ing1Name: "Bread Flour",
      ing1Qty: 500,
      ing1Unit: "g",
      ing2Name: "Water (Room Temp)",
      ing2Qty: 375,
      ing2Unit: "ml",
      ing3Name: "Active Sourdough Starter",
      ing3Qty: 100,
      ing3Unit: "g",
    },
  };

  /**
   * Helper: Show toast notification
   */
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastText.textContent = message;
    toastNotice.classList.add("show");
    toastTimer = setTimeout(() => {
      toastNotice.classList.remove("show");
    }, 3200);
  }

  /**
   * Helper: Format decimal numbers cleanly
   * E.g. 1.3333333 -> 1.33
   *      2.5000000 -> 2.5
   *      4.0000000 -> 4
   * Avoids JavaScript floating point inaccuracies (e.g., 0.1 + 0.2 = 0.30000000000000004)
   */
  function formatDecimal(num, maxDecimals = 3) {
    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
      return "0";
    }
    // Round to avoid IEEE 754 precision issues
    const factor = Math.pow(10, maxDecimals);
    const rounded = Math.round(num * factor) / factor;
    // Format to string and remove redundant trailing zeros
    return rounded.toLocaleString("en-US", {
      maximumFractionDigits: maxDecimals,
      useGrouping: false,
    });
  }

  /**
   * Helper: Set error on an input field
   */
  function setFieldError(fieldElement, errorMessage) {
    fieldElement.classList.add("input-error");
    fieldElement.setAttribute("aria-invalid", "true");
    const errorMsgElement = document.getElementById(fieldElement.id + "Error");
    if (errorMsgElement) {
      errorMsgElement.textContent = errorMessage;
      errorMsgElement.classList.add("visible");
    }
  }

  /**
   * Helper: Clear error on an input field
   */
  function clearFieldError(fieldElement) {
    fieldElement.classList.remove("input-error");
    fieldElement.removeAttribute("aria-invalid");
    const errorMsgElement = document.getElementById(fieldElement.id + "Error");
    if (errorMsgElement) {
      errorMsgElement.textContent = "";
      errorMsgElement.classList.remove("visible");
    }
  }

  /**
   * Helper: Clear all errors across all fields
   */
  function clearAllErrors() {
    Object.values(inputs).forEach((el) => {
      if (el) clearFieldError(el);
    });
    alertBanner.classList.remove("active");
    alertErrorsList.innerHTML = "";
  }

  /**
   * Live Ratio Indicator calculation as user types servings
   */
  function updateLiveRatioPreview() {
    const origVal = parseFloat(inputs.originalServings.value);
    const wantedVal = parseFloat(inputs.wantedServings.value);

    if (!isNaN(origVal) && origVal > 0 && !isNaN(wantedVal) && wantedVal > 0) {
      const ratio = wantedVal / origVal;
      ratioLiveIndicator.innerHTML = `Active Scaling Factor: <strong>${formatDecimal(ratio, 3)}×</strong> (${formatDecimal(origVal)} → ${formatDecimal(wantedVal)} servings)`;
    } else {
      ratioLiveIndicator.innerHTML = `Active Scaling Factor: <strong>—</strong> (Enter positive servings)`;
    }
  }

  /**
   * Validate all form inputs strictly per instructions:
   * - Dish name: required non-empty
   * - Servings: empty, zero, negative or invalid must show clear error
   * - 3 Ingredients: name required non-empty, original quantity non-empty, valid, > 0
   * 
   * Returns: { isValid: boolean, errors: string[], data: object | null }
   */
  function validateForm() {
    clearAllErrors();
    const errors = [];

    // 1. Dish Name
    const dishNameVal = inputs.dishName.value.trim();
    if (!dishNameVal) {
      const msg = "Dish name is required and cannot be empty.";
      setFieldError(inputs.dishName, msg);
      errors.push(msg);
    }

    // 2. Original Servings
    const origServRaw = inputs.originalServings.value.trim();
    const origServVal = parseFloat(origServRaw);
    if (!origServRaw) {
      const msg = "Original servings field is required.";
      setFieldError(inputs.originalServings, msg);
      errors.push(msg);
    } else if (isNaN(origServVal)) {
      const msg = "Original servings must be a valid number.";
      setFieldError(inputs.originalServings, msg);
      errors.push(msg);
    } else if (origServVal <= 0) {
      const msg = "Original servings must be greater than zero (cannot be 0 or negative).";
      setFieldError(inputs.originalServings, msg);
      errors.push(msg);
    }

    // 3. Wanted Servings
    const wantedServRaw = inputs.wantedServings.value.trim();
    const wantedServVal = parseFloat(wantedServRaw);
    if (!wantedServRaw) {
      const msg = "Wanted servings field is required.";
      setFieldError(inputs.wantedServings, msg);
      errors.push(msg);
    } else if (isNaN(wantedServVal)) {
      const msg = "Wanted servings must be a valid number.";
      setFieldError(inputs.wantedServings, msg);
      errors.push(msg);
    } else if (wantedServVal <= 0) {
      const msg = "Wanted servings must be greater than zero (cannot be 0 or negative).";
      setFieldError(inputs.wantedServings, msg);
      errors.push(msg);
    }

    // 4. Ingredient 1
    const ing1NameVal = inputs.ing1Name.value.trim();
    const ing1QtyRaw = inputs.ing1Qty.value.trim();
    const ing1QtyVal = parseFloat(ing1QtyRaw);
    if (!ing1NameVal) {
      const msg = "Ingredient 1 name is required.";
      setFieldError(inputs.ing1Name, msg);
      errors.push(msg);
    }
    if (!ing1QtyRaw) {
      const msg = "Ingredient 1 original quantity is required.";
      setFieldError(inputs.ing1Qty, msg);
      errors.push(msg);
    } else if (isNaN(ing1QtyVal) || ing1QtyVal <= 0) {
      const msg = "Ingredient 1 quantity must be a positive number greater than 0.";
      setFieldError(inputs.ing1Qty, msg);
      errors.push(msg);
    }

    // 5. Ingredient 2
    const ing2NameVal = inputs.ing2Name.value.trim();
    const ing2QtyRaw = inputs.ing2Qty.value.trim();
    const ing2QtyVal = parseFloat(ing2QtyRaw);
    if (!ing2NameVal) {
      const msg = "Ingredient 2 name is required.";
      setFieldError(inputs.ing2Name, msg);
      errors.push(msg);
    }
    if (!ing2QtyRaw) {
      const msg = "Ingredient 2 original quantity is required.";
      setFieldError(inputs.ing2Qty, msg);
      errors.push(msg);
    } else if (isNaN(ing2QtyVal) || ing2QtyVal <= 0) {
      const msg = "Ingredient 2 quantity must be a positive number greater than 0.";
      setFieldError(inputs.ing2Qty, msg);
      errors.push(msg);
    }

    // 6. Ingredient 3
    const ing3NameVal = inputs.ing3Name.value.trim();
    const ing3QtyRaw = inputs.ing3Qty.value.trim();
    const ing3QtyVal = parseFloat(ing3QtyRaw);
    if (!ing3NameVal) {
      const msg = "Ingredient 3 name is required.";
      setFieldError(inputs.ing3Name, msg);
      errors.push(msg);
    }
    if (!ing3QtyRaw) {
      const msg = "Ingredient 3 original quantity is required.";
      setFieldError(inputs.ing3Qty, msg);
      errors.push(msg);
    } else if (isNaN(ing3QtyVal) || ing3QtyVal <= 0) {
      const msg = "Ingredient 3 quantity must be a positive number greater than 0.";
      setFieldError(inputs.ing3Qty, msg);
      errors.push(msg);
    }

    if (errors.length > 0) {
      // Show Summary Alert Banner
      alertErrorsList.innerHTML = "";
      errors.forEach((err) => {
        const li = document.createElement("li");
        li.textContent = err;
        alertErrorsList.appendChild(li);
      });
      alertBanner.classList.add("active");
      alertBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });

      return {
        isValid: false,
        errors: errors,
        data: null,
      };
    }

    return {
      isValid: true,
      errors: [],
      data: {
        dishName: dishNameVal,
        originalServings: origServVal,
        wantedServings: wantedServVal,
        ingredients: [
          {
            name: ing1NameVal,
            originalQty: ing1QtyVal,
            unit: inputs.ing1Unit.value || "",
          },
          {
            name: ing2NameVal,
            originalQty: ing2QtyVal,
            unit: inputs.ing2Unit.value || "",
          },
          {
            name: ing3NameVal,
            originalQty: ing3QtyVal,
            unit: inputs.ing3Unit.value || "",
          },
        ],
      },
    };
  }

  /**
   * Hide calculated result and show empty placeholder state
   */
  function hideResult() {
    resultCard.classList.remove("active");
    emptyStateCard.style.display = "flex";
  }

  /**
   * Display calculated result in the 3D result card
   */
  function renderResult(resultData) {
    emptyStateCard.style.display = "none";
    resultCard.classList.add("active");

    // Populate Dish & Servings
    resultElements.dishName.textContent = resultData.dishName;
    resultElements.originalServings.textContent = formatDecimal(resultData.originalServings);
    resultElements.wantedServings.textContent = formatDecimal(resultData.wantedServings);
    resultElements.ratioMultiplier.textContent = `${formatDecimal(resultData.ratio, 3)}×`;

    // Formula Note
    resultElements.formulaNote.innerHTML = `Ratio formula: <code>${formatDecimal(resultData.wantedServings)} ÷ ${formatDecimal(resultData.originalServings)} = ${formatDecimal(resultData.ratio, 4)}</code>`;

    // Ingredients Results
    const ing1 = resultData.ingredients[0];
    resultElements.ing1Name.textContent = ing1.name;
    resultElements.ing1Base.textContent = `Base: ${formatDecimal(ing1.originalQty)} ${ing1.unit}`;
    resultElements.ing1Val.textContent = formatDecimal(ing1.scaledQty);
    resultElements.ing1Unit.textContent = ing1.unit;

    const ing2 = resultData.ingredients[1];
    resultElements.ing2Name.textContent = ing2.name;
    resultElements.ing2Base.textContent = `Base: ${formatDecimal(ing2.originalQty)} ${ing2.unit}`;
    resultElements.ing2Val.textContent = formatDecimal(ing2.scaledQty);
    resultElements.ing2Unit.textContent = ing2.unit;

    const ing3 = resultData.ingredients[2];
    resultElements.ing3Name.textContent = ing3.name;
    resultElements.ing3Base.textContent = `Base: ${formatDecimal(ing3.originalQty)} ${ing3.unit}`;
    resultElements.ing3Val.textContent = formatDecimal(ing3.scaledQty);
    resultElements.ing3Unit.textContent = ing3.unit;

    // Timestamp
    const dateStr = resultData.timestamp
      ? new Date(resultData.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    resultElements.timestamp.textContent = `Calculated & saved at ${dateStr}`;
  }

  /**
   * Execute Recipe Scaling:
   * 1. Validate inputs
   * 2. If invalid: Show errors clearly, DO NOT DISPLAY result, remove stored result
   * 3. If valid:
   *    ratio = wantedServings / originalServings
   *    each new ingredient quantity = originalQuantity * ratio
   * 4. Save inputs and valid result to localStorage
   * 5. Render result
   */
  function handleScaleRecipe() {
    const validation = validateForm();

    if (!validation.isValid) {
      // Requirement: "If either of the inputs is empty, show a validation error message.
      // servings field is empty zero,negative or invalid show a error message as clearly
      // and do not diplay the calculated result"
      hideResult();
      try {
        localStorage.removeItem(STORAGE_KEY_RESULT);
      } catch (e) {
        console.warn("LocalStorage access error:", e);
      }
      return;
    }

    const { dishName, originalServings, wantedServings, ingredients } = validation.data;

    // Scaling ratio calculation
    const ratio = wantedServings / originalServings;

    // Calculate each ingredient quantity using exact formula:
    // original quantity multiply by the ratio of wanted servings over original servings
    const scaledIngredients = ingredients.map((ing) => {
      const scaledQty = ing.originalQty * ratio;
      return {
        name: ing.name,
        originalQty: ing.originalQty,
        scaledQty: scaledQty,
        unit: ing.unit,
      };
    });

    const resultPayload = {
      dishName,
      originalServings,
      wantedServings,
      ratio,
      ingredients: scaledIngredients,
      timestamp: Date.now(),
    };

    // Save inputs and result in localStorage
    saveCurrentInputs();
    saveResult(resultPayload);

    // Display result
    renderResult(resultPayload);

    showToast("Recipe scaled successfully! Data saved to LocalStorage.");
  }

  /**
   * Save current input field values to LocalStorage
   */
  function saveCurrentInputs() {
    try {
      const currentInputs = {
        dishName: inputs.dishName.value,
        originalServings: inputs.originalServings.value,
        wantedServings: inputs.wantedServings.value,
        ing1Name: inputs.ing1Name.value,
        ing1Qty: inputs.ing1Qty.value,
        ing1Unit: inputs.ing1Unit.value,
        ing2Name: inputs.ing2Name.value,
        ing2Qty: inputs.ing2Qty.value,
        ing2Unit: inputs.ing2Unit.value,
        ing3Name: inputs.ing3Name.value,
        ing3Qty: inputs.ing3Qty.value,
        ing3Unit: inputs.ing3Unit.value,
      };
      localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(currentInputs));
      if (storageIndicator) {
        storageIndicator.textContent = "Saved";
      }
    } catch (e) {
      console.warn("Unable to save inputs to localStorage:", e);
    }
  }

  /**
   * Save calculated valid result to LocalStorage
   */
  function saveResult(resultData) {
    try {
      localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(resultData));
    } catch (e) {
      console.warn("Unable to save result to localStorage:", e);
    }
  }

  /**
   * Restore inputs and result from LocalStorage on page load / refresh
   */
  function restoreFromLocalStorage() {
    let restoredInputs = false;
    let restoredResult = false;

    // 1. Restore inputs
    try {
      const savedInputsRaw = localStorage.getItem(STORAGE_KEY_INPUTS);
      if (savedInputsRaw) {
        const parsed = JSON.parse(savedInputsRaw);
        if (parsed && typeof parsed === "object") {
          inputs.dishName.value = parsed.dishName || "";
          inputs.originalServings.value = parsed.originalServings || "";
          inputs.wantedServings.value = parsed.wantedServings || "";
          inputs.ing1Name.value = parsed.ing1Name || "";
          inputs.ing1Qty.value = parsed.ing1Qty || "";
          if (parsed.ing1Unit && inputs.ing1Unit) inputs.ing1Unit.value = parsed.ing1Unit;

          inputs.ing2Name.value = parsed.ing2Name || "";
          inputs.ing2Qty.value = parsed.ing2Qty || "";
          if (parsed.ing2Unit && inputs.ing2Unit) inputs.ing2Unit.value = parsed.ing2Unit;

          inputs.ing3Name.value = parsed.ing3Name || "";
          inputs.ing3Qty.value = parsed.ing3Qty || "";
          if (parsed.ing3Unit && inputs.ing3Unit) inputs.ing3Unit.value = parsed.ing3Unit;

          restoredInputs = true;
          updateLiveRatioPreview();
        }
      }
    } catch (e) {
      console.warn("Error restoring inputs from localStorage:", e);
    }

    // 2. Restore result
    try {
      const savedResultRaw = localStorage.getItem(STORAGE_KEY_RESULT);
      if (savedResultRaw) {
        const parsedResult = JSON.parse(savedResultRaw);
        if (
          parsedResult &&
          parsedResult.dishName &&
          parsedResult.ingredients &&
          parsedResult.ingredients.length === 3
        ) {
          renderResult(parsedResult);
          restoredResult = true;
        }
      }
    } catch (e) {
      console.warn("Error restoring result from localStorage:", e);
    }

    if (restoredInputs || restoredResult) {
      showToast("Session restored from LocalStorage");
    }
  }

  /**
   * Load a preset recipe
   */
  function loadPreset(presetKey) {
    const p = PRESETS[presetKey];
    if (!p) return;

    inputs.dishName.value = p.dishName;
    inputs.originalServings.value = p.originalServings;
    inputs.wantedServings.value = p.wantedServings;

    inputs.ing1Name.value = p.ing1Name;
    inputs.ing1Qty.value = p.ing1Qty;
    inputs.ing1Unit.value = p.ing1Unit;

    inputs.ing2Name.value = p.ing2Name;
    inputs.ing2Qty.value = p.ing2Qty;
    inputs.ing2Unit.value = p.ing2Unit;

    inputs.ing3Name.value = p.ing3Name;
    inputs.ing3Qty.value = p.ing3Qty;
    inputs.ing3Unit.value = p.ing3Unit;

    clearAllErrors();
    updateLiveRatioPreview();
    saveCurrentInputs();

    // Automatically trigger scale calculation for instant feedback
    handleScaleRecipe();
    showToast(`Loaded preset: "${p.dishName}"`);
  }

  /**
   * Reset form and clear localStorage
   */
  function resetForm() {
    form.reset();
    clearAllErrors();
    hideResult();
    updateLiveRatioPreview();

    try {
      localStorage.removeItem(STORAGE_KEY_INPUTS);
      localStorage.removeItem(STORAGE_KEY_RESULT);
    } catch (e) {
      console.warn("Error clearing localStorage:", e);
    }

    showToast("Form and saved storage cleared");
  }

  /**
   * Copy scaled recipe summary to clipboard
   */
  async function copyRecipeSummary() {
    const dish = resultElements.dishName.textContent;
    const origServ = resultElements.originalServings.textContent;
    const newServ = resultElements.wantedServings.textContent;
    const ratio = resultElements.ratioMultiplier.textContent;

    const ing1 = `${resultElements.ing1Name.textContent}: ${resultElements.ing1Val.textContent} ${resultElements.ing1Unit.textContent}`;
    const ing2 = `${resultElements.ing2Name.textContent}: ${resultElements.ing2Val.textContent} ${resultElements.ing2Unit.textContent}`;
    const ing3 = `${resultElements.ing3Name.textContent}: ${resultElements.ing3Val.textContent} ${resultElements.ing3Unit.textContent}`;

    const summaryText = [
      `--- ${dish.toUpperCase()} (SCALED RECIPE) ---`,
      `Original Servings: ${origServ} | Target Servings: ${newServ} (Scaling Factor: ${ratio})`,
      `Ingredients:`,
      `1. ${ing1}`,
      `2. ${ing2}`,
      `3. ${ing3}`,
      `--- Scaled with Culinary Scale Pro ---`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summaryText);
      showToast("Copied scaled recipe to clipboard!");
    } catch (err) {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = summaryText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("Copied scaled recipe to clipboard!");
    }
  }

  /**
   * Interactive 3D Perspective Tilt on Mouse Movement
   */
  function init3DTilt() {
    const card = document.getElementById("resultCard3D");
    if (!card) return;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles (subtle enterprise aesthetic)
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    });
  }

  /**
   * Initialize All Event Listeners
   */
  function initEvents() {
    // Scale button click
    scaleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleScaleRecipe();
    });

    // Form submit prevention (enter key in input fields triggers scale)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleScaleRecipe();
    });

    // Reset button
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetForm();
    });

    // Auto-save input changes and update live preview
    Object.values(inputs).forEach((inputEl) => {
      if (!inputEl) return;
      inputEl.addEventListener("input", () => {
        clearFieldError(inputEl);
        if (alertBanner.classList.contains("active")) {
          // If all fields are fixed, hide alert
          const anyErrors = form.querySelectorAll(".input-error");
          if (anyErrors.length === 0) {
            alertBanner.classList.remove("active");
          }
        }
        updateLiveRatioPreview();
        saveCurrentInputs();
      });

      if (inputEl.tagName === "SELECT") {
        inputEl.addEventListener("change", () => {
          saveCurrentInputs();
        });
      }
    });

    // Presets buttons
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const presetKey = btn.getAttribute("data-preset");
        if (presetKey) {
          loadPreset(presetKey);
        }
      });
    });

    // Copy to clipboard
    const copyBtn = document.getElementById("copySummaryBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", copyRecipeSummary);
    }

    // Print recipe
    const printBtn = document.getElementById("printRecipeBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }

    // Initialize 3D hover effects
    init3DTilt();
  }

  // Application Entry Point
  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    restoreFromLocalStorage();
  });
})();
