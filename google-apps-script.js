/**
 * GOOGLE APPS SCRIPT ДЛЯ ДВУСТОРОННЕЙ СИНХРОНИЗАЦИИ
 * Панель управления отделом контента и КАМ
 * 
 * ИНСТРУКЦИЯ ПО УСТАНОВКЕ (1 минута):
 * 1. Откройте вашу Google Таблицу
 * 2. В верхнем меню нажмите: Расширения -> Apps Script (Extensions -> Apps Script)
 * 3. Удалите весь существующий код и вставьте содержимое этого файла
 * 4. Нажмите синюю кнопку «Развернуть» (Deploy) -> «Новое развертывание» (New deployment)
 * 5. Выберите тип: «Веб-приложение» (Web app)
 * 6. Настройки:
 *    - Описание: Content Ops Webhook
 *    - Запуск от имени: «Я» (Me)
 *    - У кого есть доступ: «Все» (Anyone) — это позволит приложению и Vercel отправлять обновления статусов
 * 7. Нажмите «Развернуть» (Deploy), предоставьте разрешения при первом запуске
 * 8. Скопируйте полученный URL веб-приложения (заканчивается на /exec) и вставьте его в настройки в приложении!
 */

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }
  } else if (e && e.parameter) {
    data = e.parameter;
  }
  return handleRequest(data);
}

function handleRequest(data) {
  var action = data.action || 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var response = {
    success: false,
    action: action,
    timestamp: new Date().toISOString()
  };

  try {
    if (action === 'ping' || action === 'test') {
      response.success = true;
      response.message = 'Связь с Google Таблицей успешно установлена';
      response.spreadsheetName = ss.getName();
      response.sheets = ss.getSheets().map(function(s) { return s.getName(); });
    }
    
    // 1. Обновление статусов товаров по файлам / артикулам
    else if (action === 'updateProductStatus') {
      var dept = data.department || 'Отдел контента';
      var sheetName = dept.indexOf('КАМ') !== -1 || dept.indexOf('Коммерческий') !== -1 
        ? 'Коммерческий отдел' 
        : 'Отдел контента';
      
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        // Fallback search
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().indexOf('контент') !== -1 && sheetName === 'Отдел контента') {
            sheet = sheets[i]; break;
          }
          if ((sheets[i].getName().indexOf('КАМ') !== -1 || sheets[i].getName().indexOf('Коммерч') !== -1) && sheetName === 'Коммерческий отдел') {
            sheet = sheets[i]; break;
          }
        }
      }

      if (!sheet) {
        throw new Error('Лист "' + sheetName + '" не найден в таблице');
      }

      var files = data.files || [];
      var updates = data.updates || {};
      var fileSet = {};
      for (var f = 0; f < files.length; f++) {
        fileSet[files[f].toLowerCase().trim()] = true;
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var updatedRows = 0;

      // Колонка 12 (L, индекс 11) - Источник (имя файла)
      // Колонка 5 (E, индекс 4) - Статус
      // Колонка 6 (F, индекс 5) - Причина паузы
      // Колонка 7 (G, индекс 6) - Дата паузы
      // Колонка 8 (H, индекс 7) - Исполнитель
      // Колонка 9 (I, индекс 8) - Дата взятия
      // Колонка 10 (J, индекс 9) - Дата выполнения
      // Колонка 11 (K, индекс 10) - Дата завершения работы

      for (var r = 1; r < values.length; r++) {
        var rowSource = (values[r][11] || '').toString().toLowerCase().trim();
        var rowCode = (values[r][1] || '').toString().trim();

        if (fileSet[rowSource] || (data.externalCodes && data.externalCodes.indexOf(rowCode) !== -1)) {
          if (updates.status !== undefined) values[r][4] = updates.status;
          if (updates.pauseReason !== undefined) values[r][5] = updates.pauseReason;
          if (updates.pauseDate !== undefined) values[r][6] = updates.pauseDate;
          if (updates.executor !== undefined) values[r][7] = updates.executor;
          if (updates.dateTaken !== undefined) values[r][8] = updates.dateTaken;
          if (updates.dateCompleted !== undefined) values[r][9] = updates.dateCompleted;
          if (updates.dateFinished !== undefined) values[r][10] = updates.dateFinished;
          updatedRows++;
        }
      }

      if (updatedRows > 0) {
        dataRange.setValues(values);
      }

      // Также обновляем лист рабочих групп если он есть
      var workingSheetName = sheetName === 'Коммерческий отдел' ? 'Рабочие группы КАМ' : 'Рабочие группы контент';
      var wSheet = ss.getSheetByName(workingSheetName);
      if (wSheet) {
        var wRange = wSheet.getDataRange();
        var wValues = wRange.getValues();
        var wUpdated = false;
        for (var wr = 1; wr < wValues.length; wr++) {
          var wFile = (wValues[wr][0] || '').toString().toLowerCase().trim();
          if (fileSet[wFile]) {
            if (updates.status !== undefined) wValues[wr][6] = updates.status;
            if (updates.pauseReason !== undefined) wValues[wr][7] = updates.pauseReason;
            if (updates.pauseDate !== undefined) wValues[wr][8] = updates.pauseDate;
            if (updates.executor !== undefined) wValues[wr][9] = updates.executor;
            if (updates.dateTaken !== undefined) wValues[wr][10] = updates.dateTaken;
            if (updates.dateFinished !== undefined || updates.dateCompleted !== undefined) {
              wValues[wr][11] = updates.dateFinished || updates.dateCompleted;
            }
            wUpdated = true;
          }
        }
        if (wUpdated) {
          wRange.setValues(wValues);
        }
      }

      response.success = true;
      response.updatedRows = updatedRows;
      response.message = 'Обновлено строк в таблице: ' + updatedRows;
    }
    
    // 2. Обновление группы категорий (менеджер, статус КАМ файла, даты, включения)
    else if (action === 'updateGroup') {
      var group3 = (data.group3 || '').toString().trim().toLowerCase();
      var gUpdates = data.updates || {};
      var allSheets = ss.getSheets();
      var foundAny = false;

      // 1) Ищем в листах с группами (первый лист или лист со структурой групп)
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        var sName = sh.getName().toLowerCase();
        var sRange = sh.getDataRange();
        var sValues = sRange.getValues();
        if (sValues.length < 2) continue;

        var headerRow = sValues[0].map(function(c) { return (c || '').toString().toLowerCase(); });
        var g3ColIdx = -1;
        for (var c = 0; c < headerRow.length; c++) {
          if (headerRow[c].indexOf('группа 3') !== -1 || headerRow[c].indexOf('группа товаров') !== -1 || headerRow[c].indexOf('категория') !== -1) {
            g3ColIdx = c;
            break;
          }
        }
        if (g3ColIdx === -1 && sValues[0].length >= 3) {
          // Если 3-я колонка содержит группу 3
          g3ColIdx = 2;
        }

        var sModified = false;
        for (var row = 1; row < sValues.length; row++) {
          var curG3 = (sValues[row][g3ColIdx] || '').toString().trim().toLowerCase();
          if (curG3 === group3 || (group3 && curG3 && (curG3.indexOf(group3) !== -1 || group3.indexOf(curG3) !== -1))) {
            // Обновляем по известным колонкам таблицы вывода групп:
            // 0: Группа 1, 1: Группа 2, 2: Группа 3, 3: Менеджер, 4: Материк, 5: Палас, 6: СКУ, 7: Дата начала, 8: Запрос КМ, 9: Получ.доноров, 10: Отправка согл, 11: Дата согл, 12: Дата вывода, 13: Выделено Палас, 14: В файл КАМ
            if (gUpdates.group1 !== undefined && sValues[row].length > 0) sValues[row][0] = gUpdates.group1;
            if (gUpdates.group2 !== undefined && sValues[row].length > 1) sValues[row][1] = gUpdates.group2;
            if (gUpdates.manager !== undefined && sValues[row].length > 3) sValues[row][3] = gUpdates.manager;
            if (gUpdates.includedMaterik !== undefined && sValues[row].length > 4) sValues[row][4] = gUpdates.includedMaterik;
            if (gUpdates.includedPalas !== undefined && sValues[row].length > 5) sValues[row][5] = gUpdates.includedPalas;
            if (gUpdates.skuCount !== undefined && sValues[row].length > 6) sValues[row][6] = gUpdates.skuCount;
            if (gUpdates.startDate !== undefined && sValues[row].length > 7) sValues[row][7] = gUpdates.startDate;
            if (gUpdates.donorRequestDate !== undefined && sValues[row].length > 8) sValues[row][8] = gUpdates.donorRequestDate;
            if (gUpdates.donorReceivedDate !== undefined && sValues[row].length > 9) sValues[row][9] = gUpdates.donorReceivedDate;
            if (gUpdates.approvalSentDate !== undefined && sValues[row].length > 10) sValues[row][10] = gUpdates.approvalSentDate;
            if (gUpdates.approvalDate !== undefined && sValues[row].length > 11) sValues[row][11] = gUpdates.approvalDate;
            if (gUpdates.releaseDate !== undefined && sValues[row].length > 12) sValues[row][12] = gUpdates.releaseDate;
            if (gUpdates.palasAllocated !== undefined && sValues[row].length > 13) sValues[row][13] = gUpdates.palasAllocated;
            if (gUpdates.kamFile !== undefined && sValues[row].length > 14) sValues[row][14] = gUpdates.kamFile;

            // Если это лист Новые товары
            if (sName.indexOf('новые') !== -1) {
              if (gUpdates.manager !== undefined) sValues[row][5] = gUpdates.manager;
              if (gUpdates.kamFile !== undefined) {
                var isDone = gUpdates.kamFile === 'Добавлено' || gUpdates.kamFile === 'да';
                sValues[row][7] = isDone ? 'TRUE' : 'FALSE';
                sValues[row][8] = isDone ? 'TRUE' : 'FALSE';
              }
            }

            sModified = true;
            foundAny = true;
          }
        }

        if (sModified) {
          sRange.setValues(sValues);
        }
      }

      response.success = true;
      response.found = foundAny;
      response.message = 'Группа "' + data.group3 + '" обновлена в таблице';
    }

    // 3. Добавление / обновление задачи
    else if (action === 'updateTask' || action === 'addTask') {
      var taskSheet = ss.getSheetByName('Задачи');
      if (!taskSheet) {
        taskSheet = ss.insertSheet('Задачи');
        taskSheet.appendRow(['ID', 'Тема', 'Описание', 'Исполнители', 'Статус', 'Срочность', 'Изображения Base64', 'Дата создания', 'Дата обновления']);
      }

      var tData = data.task || {};
      var tRange = taskSheet.getDataRange();
      var tValues = tRange.getValues();
      var taskFound = false;

      for (var tr = 1; tr < tValues.length; tr++) {
        if ((tValues[tr][0] || '').toString() === (tData.id || '').toString()) {
          tValues[tr][1] = tData.title || tValues[tr][1];
          tValues[tr][2] = tData.description || tValues[tr][2];
          tValues[tr][3] = tData.executors || tValues[tr][3];
          tValues[tr][4] = tData.status || tValues[tr][4];
          tValues[tr][5] = tData.urgency || tValues[tr][5];
          tValues[tr][6] = tData.imageBase64 || tValues[tr][6];
          tValues[tr][8] = tData.updatedAt || new Date().toLocaleString('ru-RU');
          taskFound = true;
          break;
        }
      }

      if (taskFound) {
        tRange.setValues(tValues);
      } else {
        taskSheet.appendRow([
          tData.id || String(tValues.length),
          tData.title || '',
          tData.description || '',
          tData.executors || '',
          tData.status || 'Новая',
          tData.urgency || 'Текущая задача',
          tData.imageBase64 || '',
          tData.createdAt || new Date().toLocaleString('ru-RU'),
          tData.updatedAt || new Date().toLocaleString('ru-RU')
        ]);
      }

      response.success = true;
      response.message = 'Задача успешно сохранена в таблице';
    }

    // 4. Удаление задачи
    else if (action === 'deleteTask') {
      var tSheet = ss.getSheetByName('Задачи');
      if (tSheet) {
        var tVals = tSheet.getDataRange().getValues();
        for (var dTr = 1; dTr < tVals.length; dTr++) {
          if ((tVals[dTr][0] || '').toString() === (data.id || '').toString()) {
            tSheet.deleteRow(dTr + 1);
            break;
          }
        }
      }
      response.success = true;
      response.message = 'Задача удалена из таблицы';
    }

    else {
      response.error = 'Неизвестное действие: ' + action;
    }

  } catch (e) {
    response.success = false;
    response.error = e.toString();
  }

  var output = ContentService.createTextOutput(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
