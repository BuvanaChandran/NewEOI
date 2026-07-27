
(function(){
  "use strict";

  const state = {
    category: null,
    subCategory: null,
    rows: []          
  };


  const DISPLAY_NAMES = {
    'Institutes of National Importan': 'Institutes of National Importance',
    'Universities and Deemed Univers': 'Universities and Deemed Universities',
    'Research, Training and Autonomo': 'Research, Training and Autonomous Institutions',
    'Schools offering Vocational Edu': 'Schools offering Vocational Education',
    'Central Government Training Ins': 'Central Government Training Institutions',
    'State Government Training Insti': 'State Government Training Institutions',
    'Govt- Affiliated Training Insti': 'Govt-Affiliated Training Institutions',
    'Regulatory body- Affiliated Tra': 'Regulatory Body-Affiliated Training Institutions',
    'Industries  Employers': 'Industries / Employers',
    'Staffing and workforce solution': 'Staffing and Workforce Solutions',
    'Overseas Recruitment Agencies(M': 'Overseas Recruitment Agencies (Manpower)',
    'Community-Based Organisations (': 'Community-Based Organisations',
    ' Intergovernmental Organisation': 'Intergovernmental Organisations'
  };
  function displayName(key){ return DISPLAY_NAMES[key] || key.trim(); }


  const FIELD_VALIDATORS = [
    { test:/aadhaar|aadhar/i,                 pattern:'[0-9]{12}',                                   inputmode:'numeric', maxlength:12,
      message:'Enter exactly 12 digits, numbers only.' },
    { test:/\bpan\b|pan\s*number|pan\s*card/i, pattern:'[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}',              maxlength:10, upper:true,
      message:'Enter a valid PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).' },
    { test:/gstin|gst\s*number|gst\s*no/i,     pattern:'[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[A-Za-z0-9]{1}Z[A-Za-z0-9]{1}', maxlength:15, upper:true,
      message:'Enter a valid 15-character GSTIN.' },
    { test:/ifsc/i,                            pattern:'[A-Za-z]{4}0[A-Za-z0-9]{6}',                  maxlength:11, upper:true,
      message:'Enter a valid IFSC code: 4 letters, then 0, then 6 letters/digits.' },
    { test:/\btan\b/i,                         pattern:'[A-Za-z]{4}[0-9]{5}[A-Za-z]{1}',              maxlength:10, upper:true,
      message:'Enter a valid TAN: 4 letters, 5 digits, 1 letter.' },
    { test:/cin\s*\/\s*llpin|cin\s*\/\s*registration/i, pattern:'[A-Za-z0-9]{7,21}', upper:true,
      message:'Enter a valid CIN or LLPIN/Registration number (letters and digits).' },
    { test:/\bcin\b/i,                         pattern:'[A-Za-z][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}', maxlength:21, upper:true,
      message:'Enter a valid 21-character CIN.' },
    { test:/mobile|\bphone\b|contact\s*number/i, pattern:'[6-9][0-9]{9}',                            inputmode:'numeric', maxlength:10,
      message:'Enter a valid 10-digit mobile number (starts 6-9).' },
    { test:/pin\s*code|pincode|postal\s*code/i, pattern:'[0-9]{6}',                                  inputmode:'numeric', maxlength:6,
      message:'Enter a valid 6-digit PIN code.' },
    { test:/e-?mail/i,                         type:'email',
      message:'Enter a valid email address.' },
    { test:/website|\burl\b|\blink\b/i,        type:'url',
      message:'Enter a valid URL, starting with http:// or https://' },
    { test:/udyam/i,                           pattern:'UDYAM-[A-Za-z]{2}-[0-9]{2}-[0-9]{7}', maxlength:19, upper:true,
      message:'Format: UDYAM-XX-00-0000000' },
    { test:{ test:(s)=> /experience/i.test(s) && /years?/i.test(s) },     pattern:'[0-9]{1,2}(\\s*-\\s*[0-9]{1,2})?', maxlength:8,
      message:'Enter a number of years, or a range like 3-5.' },
    { test:{ test:(s)=> /years?/i.test(s) && !/covered|wise|month|break|experience|figure|average/i.test(s) },      pattern:'(19|20)[0-9]{2}', inputmode:'numeric', maxlength:4,
      message:'Enter a 4-digit year (e.g. 2024).' },
    { test:{ test:(s)=> /\bdate\b/i.test(s) && !/\b(no\.?|number)\b/i.test(s) },     type:'date', maxToday:true,
      message:'Enter a valid date — it cannot be in the future.' },
    
  ];



  
  function getValidator(fieldLabel, docType){
    const isTypeDescriptor = /\btype\b/i.test(fieldLabel);
    if(!isTypeDescriptor){
      for(const rule of FIELD_VALIDATORS){ if(rule.test.test(fieldLabel)) return rule; }
    }
    if(docType && docType.toLowerCase().trim() === 'number' && !isTypeDescriptor){
      return { pattern:'[0-9]+', inputmode:'numeric', message:'Numbers only.' };
    }
    return null;
  }

  const $categoryGrid    = $('#categoryGrid');
  const $subcategoryGrid = $('#subcategoryGrid');
  const $navList         = $('#navList');
  const $eoiForm         = $('#eoiForm');

  /* Helpers */
  function slug(str){
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }

  function needsFileUpload(docType){
    if(!docType) return false;
    const dt = docType.toLowerCase().trim();
    if(dt === 'number') return false;                       
    if(dt.indexOf('form entry (no document)') !== -1) return false;
    return true; 
  }

  function showScreen(id){
    $('.screen').addClass('is-hidden');
    $('#'+id).removeClass('is-hidden');
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function toast(msg){
    const $t = $('#toast');
    $t.text(msg).addClass('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> $t.removeClass('is-visible'), 2400);
  }

  function categoryHasMultipleSubtypes(catName){
    const subs = EOI_DATA[catName];
    return Object.keys(subs).length > 1;
  }

  function firstSubKey(catName){
    return Object.keys(EOI_DATA[catName])[0];
  }

  /* Screen 1 — Category grid */
  function renderCategories(){
    const cats = Object.keys(EOI_DATA);
    $categoryGrid.empty();
    cats.forEach((cat, i)=>{
      const subCount = Object.keys(EOI_DATA[cat]).length;
      const rowCount = EOI_DATA[cat][Object.keys(EOI_DATA[cat])[0]].length;
      const countLabel = subCount > 1 ? subCount + ' dossier types' : rowCount + ' requirement items';
      const $card = $(`
        <button type="button" class="cat-card" data-cat="${slug(cat)}">
          <span class="cat-index">${String(i+1).padStart(2,'0')}</span>
          <span class="cat-name"></span>
          <span class="cat-count">${countLabel}</span>
        </button>
      `);
      $card.find('.cat-name').text(cat);
      $card.on('click', ()=> onCategoryChosen(cat));
      $categoryGrid.append($card);
    });
  }

  function onCategoryChosen(cat){
    state.category = cat;
    if(categoryHasMultipleSubtypes(cat)){
      renderSubcategories(cat);
      showScreen('screen-subcategory');
    } else {
      state.subCategory = firstSubKey(cat);
      buildForm();
      showScreen('screen-form');
    }
  }

  /* Screen 2 — Sub-category grid*/
  function renderSubcategories(cat){
    $('#subTitle').text('Which type of ' + cat.replace(/\s*\(.*\)/,'') + ' is this?');
    $subcategoryGrid.empty();
    const subs = Object.keys(EOI_DATA[cat]);
    subs.forEach((sub, i)=>{
      const rowCount = EOI_DATA[cat][sub].length;
      const $card = $(`
        <button type="button" class="cat-card" data-sub="${slug(sub)}">
          <span class="cat-index">${String(i+1).padStart(2,'0')}</span>
          <span class="cat-name"></span>
          <span class="cat-count">${rowCount} requirement items</span>
        </button>
      `);
      $card.find('.cat-name').text(displayName(sub));
      $card.on('click', ()=>{
        state.subCategory = sub;
        buildForm();
        showScreen('screen-form');
      });
      $subcategoryGrid.append($card);
    });
  }

  /* Screen 3 — Build the dynamic form from state.rows */
  function buildForm(){
    state.rows = EOI_DATA[state.category][state.subCategory];

    $('#navCategoryName').text(state.category);
    $('#navSubName').text(state.subCategory === state.category ? '' : displayName(state.subCategory));
    $('#formTitle').text(state.subCategory === state.category ? state.category : displayName(state.subCategory));

    const mandatoryCount = state.rows.filter(r => /^mandatory/i.test(r.mandatory)).length;
    $('#navCounter').text(mandatoryCount + ' mandatory of ' + state.rows.length + ' total items');

    $eoiForm.empty();
    $navList.empty();

    state.rows.forEach((row, idx)=>{
      const rowId = 'row-' + idx;
      const isMandatory = /^mandatory/i.test(row.mandatory);

      // ---- nav entry
      const $navItem = $(`<li><a href="#${rowId}" class="nav-link" data-row="${idx}"><span class="dot"></span><span class="nav-label"></span></a></li>`);
      $navItem.find('.nav-label').text((idx+1) + '. ' + row.docName);
      $navList.append($navItem);

      // ---- docket card
      const $docket = $(`
        <fieldset class="docket" id="${rowId}" data-row="${idx}" data-mandatory="${isMandatory ? 'yes':'no'}">
          <div class="docket-head">
            <span class="docket-seal">${idx+1}</span>
            <div class="docket-title-wrap">
              <div class="docket-title"></div>
              <div class="docket-meta">
                <span class="doc-type"></span>
                <span class="tag ${isMandatory ? 'tag-mandatory':'tag-optional'}">${row.mandatory || (isMandatory?'Mandatory':'Optional')}</span>
              </div>
              ${remarkNote(row.remarks)}
            </div>
          </div>
          <div class="docket-body">
            <div class="field-grid"></div>
          </div>
        </fieldset>
      `);
      $docket.find('.docket-title').text(row.docName);
      $docket.find('.doc-type').text(row.docType || '');

      const $grid = $docket.find('.field-grid');
      row.fields.forEach((field, fi)=>{
        const inputId = rowId + '-f' + fi;
        const long = field.length > 60 || /,/.test(field);
        const $field = $(`
          <div class="field">
            <label for="${inputId}"></label>
            ${long
              ? `<textarea id="${inputId}" name="${inputId}" data-label=""></textarea>`
              : `<input type="text" id="${inputId}" name="${inputId}" data-label="" autocomplete="off">`
            }
          </div>
        `);
        const $label = $field.find('label');
        $label.text(field);
        if(isMandatory){
          $label.append('<span class="req" title="Required">*</span>');
          $field.find('input,textarea').attr('required', true);
        }
        $field.find('input,textarea').attr('data-label', field).attr('placeholder', 'Enter ' + field.toLowerCase());

        const rule = getValidator(field, row.docType);
        const $input = $field.find('input');   
        if(rule && $input.length){
          if(rule.type) $input.attr('type', rule.type);   
          if(rule.pattern) $input.attr('pattern', rule.pattern);
          if(rule.inputmode) $input.attr('inputmode', rule.inputmode);
          if(rule.maxlength) $input.attr('maxlength', rule.maxlength);
          if(rule.upper) $input.addClass('input-upper');
          $input.attr('title', rule.message);
          $field.append(`<span class="field-hint">${escapeHtml(rule.message)}</span>`);
        }
        $grid.append($field);
      });

      if(needsFileUpload(row.docType)){
        const fileId = rowId + '-file';
        const $upload = $(`
          <div class="upload-field">
            <span class="upload-icon">📎</span>
            <div class="upload-text">
              <b>Attach: ${escapeHtml(row.docName)}</b>
              <span>${escapeHtml(row.docType)}</span>
            </div>
            <input type="file" id="${fileId}" name="${fileId}" data-row="${idx}" ${isMandatory ? 'required' : ''}>
          </div>
        `);
        $docket.find('.docket-body').append($upload);
      }

      $eoiForm.append($docket);
    });

    bindLiveTracking();
    bindScrollSpy();
    updateProgress();
  }

  function remarkNote(remarks){
    if(!remarks || /no change/i.test(remarks)) return '';
    if(/^new/i.test(remarks)) return '<span class="docket-remark">New requirement in this EOI</span>';
    if(/^updated/i.test(remarks)) return '<span class="docket-remark">Updated vs. previous EOI</span>';
    return '<span class="docket-remark">' + escapeHtml(remarks) + '</span>';
  }

  function escapeHtml(str){
    return $('<div>').text(str).html();
  }

  /* live tracking*/
  function bindLiveTracking(){
    $eoiForm.off('input change');
    $eoiForm.on('input', 'input.input-upper', function(){
      const pos = this.selectionStart;
      this.value = this.value.toUpperCase();
      if(pos !== null) this.setSelectionRange(pos, pos);
    });
    $eoiForm.on('input', 'input[type="text"], input[type="email"], input[type="url"], textarea', function(){
      const $f = $(this).closest('.field');
      const val = $.trim($(this).val());
      const hasValue = val.length > 0;
      const valid = this.checkValidity ? this.checkValidity() : true;
      $f.toggleClass('is-invalid', hasValue && !valid);
      $f.toggleClass('is-filled', hasValue && valid);
      updateProgress();
    });
    $eoiForm.on('change', 'input[type="file"]', function(){
      const $u = $(this).closest('.upload-field');
      $u.toggleClass('is-filled', this.files && this.files.length > 0);
      updateProgress();
    });
  }

  function rowIsComplete(idx){
    const $docket = $('#row-'+idx);
    let complete = true;
    $docket.find('input[required][type="text"], input[required][type="email"], input[required][type="url"], textarea[required]').each(function(){
      const val = $.trim($(this).val());
      if(val.length === 0) complete = false;
      else if(this.checkValidity && !this.checkValidity()) complete = false;
    });
    $docket.find('input[type="file"][required]').each(function(){
      if(!(this.files && this.files.length > 0)) complete = false;
    });
    return complete;
  }


  function rowHasInvalidFormat(idx){
    const $docket = $('#row-'+idx);
    let bad = false;
    $docket.find('.field input[type="text"], .field input[type="email"], .field input[type="url"]').each(function(){
      const val = $.trim($(this).val());
      if(val.length > 0 && this.checkValidity && !this.checkValidity()) bad = true;
    });
    return bad;
  }

  function updateProgress(){
    let totalRequired = 0, filledRequired = 0;
    state.rows.forEach((row, idx)=>{
      const isMandatory = /^mandatory/i.test(row.mandatory);
      if(!isMandatory) return;
      const complete = rowIsComplete(idx);
      totalRequired++;
      if(complete) filledRequired++;

      const $navLink = $('.nav-link[data-row="'+idx+'"]');
      $navLink.toggleClass('is-complete', complete);
    });

    const pct = totalRequired === 0 ? 100 : Math.round((filledRequired/totalRequired)*100);
    $('#progressFill').css('width', pct + '%');
    $('#headerStatus').text(state.category ? (pct + '% of mandatory items complete') : '');
    $('#submitSummary').html('<b>' + filledRequired + ' / ' + totalRequired + '</b> mandatory items complete');
    $('#submitBtn').prop('disabled', false); // allow click; we validate & explain on submit
  }

  /* highlight active section on scroll */
  function bindScrollSpy(){
    $(window).off('scroll.spy').on('scroll.spy', function(){
      const $dockets = $('.docket');
      if(!$dockets.length) return;
      let activeIdx = 0;
      $dockets.each(function(){
        const top = this.getBoundingClientRect().top;
        if(top - 110 <= 0) activeIdx = $(this).data('row');
      });
      $('.nav-link').removeClass('is-active');
      $('.nav-link[data-row="'+activeIdx+'"]').addClass('is-active');
    });
  }

  /* Submit → collect payload → review screen */
  function collectPayload(){
    const items = state.rows.map((row, idx)=>{
      const $docket = $('#row-'+idx);
      const fields = {};
      $docket.find('.field input[type="text"], .field textarea').each(function(){
        fields[$(this).data('label')] = $.trim($(this).val());
      });
      const $file = $docket.find('input[type="file"]');
      const fileProvided = $file.length > 0 && $file[0].files.length > 0;
      return {
        docName: row.docName,
        docType: row.docType,
        mandatory: row.mandatory,
        remarks: row.remarks,
        fields: fields,
        fileProvided: fileProvided,
        fileName: fileProvided ? $file[0].files[0].name : null
      };
    });
    return {
      category: state.category,
      subCategory: state.subCategory,
      submittedAt: new Date().toISOString(),
      items: items
    };
  }

 
  const MOCK_STORAGE_KEY = 'eoi_mock_submissions';

  window.submitEOI = function(payload){
    try{
      const existing = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || '[]');
      existing.push(payload);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(existing));
    }catch(err){
      console.warn('Mock storage failed (private browsing / quota?):', err);
    }
    return $.Deferred().resolve({ ok:true, received: payload }).promise();
  };

  window.listMockSubmissions = function(){
    try{ return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || '[]'); }
    catch(err){ return []; }
  };

  window.clearMockSubmissions = function(){
    localStorage.removeItem(MOCK_STORAGE_KEY);
  };

  $eoiForm.on('submit', function(e){
    e.preventDefault();
    const missing = [];
    const invalidFormat = [];
    state.rows.forEach((row, idx)=>{
      if(/^mandatory/i.test(row.mandatory) && !rowIsComplete(idx)) missing.push(idx);
      if(rowHasInvalidFormat(idx)) invalidFormat.push(idx);
    });
    if(missing.length || invalidFormat.length){
      const firstBad = invalidFormat.length ? invalidFormat[0] : missing[0];
      const msg = invalidFormat.length
        ? invalidFormat.length + ' item(s) have an invalid format — jumping to the first one.'
        : missing.length + ' mandatory item(s) still need information — jumping to the first one.';
      toast(msg);
      $('.docket').removeClass('is-flagged');
      const el = document.getElementById('row-'+firstBad);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
      $(el).addClass('is-flagged');
      setTimeout(()=> $(el).removeClass('is-flagged'), 1200);
      return;
    }

    const payload = collectPayload();
    window.submitEOI(payload).then(function(){
      $('#jsonPreview').text(JSON.stringify(payload, null, 2));
      $('#reviewLede').text('All mandatory items for "' + (state.subCategory===state.category ? state.category : displayName(state.subCategory)) + '" have been completed and compiled below.');
      const savedCount = window.listMockSubmissions().length;
      $('#mockCount').text('Saved to this browser\'s test storage: ' + savedCount + ' submission' + (savedCount===1?'':'s') + ' so far.');
      showScreen('screen-review');
    });
  });

  /* JSON downlpad */
  function downloadJson(obj, filename){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  $('#saveDraftBtn').on('click', function(){
    downloadJson(collectPayload(), 'eoi-draft.json');
    toast('Draft downloaded — file uploads are not embedded in the draft.');
  });

  $('#downloadJsonBtn').on('click', function(){
    downloadJson(collectPayload(), 'eoi-submission.json');
  });

  $('#editAgainBtn').on('click', function(){ showScreen('screen-form'); });

  $('#backToCategory').on('click', function(){ showScreen('screen-category'); });

  $('#backToPrevious').on('click', function(){
    if(categoryHasMultipleSubtypes(state.category)){
      showScreen('screen-subcategory');
    } else {
      showScreen('screen-category');
    }
  });

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  renderCategories();
  showScreen('screen-category');

})();
