(function() {
  var API_URL = window.CHAT_API_URL || '';
  var chatMessages = [];

  function getPageContent() {
    var content = window.CONTENT;
    if (!content) return '';
    var parts = [];
    if (content.about) {
      parts.push('Om meg: ' + (content.about.lead || ''));
      if (content.about.paragraphs && content.about.paragraphs.length) {
        parts.push(content.about.paragraphs.join(' '));
      }
    }
    if (content.projects && content.projects.items) {
      var items = content.projects.items.map(function(i) {
        return (i.title || '') + ' - ' + (i.description || '') + (i.details ? ' ' + i.details : '');
      });
      parts.push('Erfaringer: ' + items.join(' | '));
    }
    return parts.join('\n\n');
  }

  function createWidget() {
    var html = '<div id="chat-widget" class="chat-widget">' +
      '<button id="chat-toggle" class="chat-toggle" aria-label="Åpne chat">💬</button>' +
      '<div id="chat-panel" class="chat-panel">' +
      '<div class="chat-panel-header">' +
      '<h3>Spør om Jon</h3>' +
      '<button id="chat-close" class="chat-close" aria-label="Lukk">×</button>' +
      '</div>' +
      '<div id="chat-messages" class="chat-messages"></div>' +
      '<div class="chat-actions">' +
      '<button id="chat-clear" class="chat-action-btn" title="Tøm chat">Tøm</button>' +
      '<button id="chat-export-pdf" class="chat-action-btn" title="Eksporter til PDF">Eksporter PDF</button>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
      '<input id="chat-input" type="text" placeholder="Spør om erfaring, utdanning..." maxlength="500">' +
      '<button id="chat-send" class="chat-send">Send</button>' +
      '</div>' +
      '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function init() {
    createWidget();
    var toggle = document.getElementById('chat-toggle');
    var panel = document.getElementById('chat-panel');
    var closeBtn = document.getElementById('chat-close');
    var messages = document.getElementById('chat-messages');
    var input = document.getElementById('chat-input');
    var sendBtn = document.getElementById('chat-send');

    function open() { panel.classList.add('chat-panel-open'); }
    function close() { panel.classList.remove('chat-panel-open'); }

    toggle.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    function addMessage(text, isUser) {
      chatMessages.push({ text: text, isUser: isUser });
      var div = document.createElement('div');
      div.className = 'chat-msg ' + (isUser ? 'chat-msg-user' : 'chat-msg-bot');
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function clearChat() {
      chatMessages = [];
      messages.innerHTML = '';
    }

    function exportPdf() {
      if (chatMessages.length === 0) {
        alert('Ingen meldinger å eksportere. Start en samtale først.');
        return;
      }
      var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || (typeof jspdf !== 'undefined' && jspdf.jsPDF);
      if (!JsPDF) {
        alert('PDF-bibliotek ikke lastet. Sjekk internettforbindelsen.');
        return;
      }
      var doc = new JsPDF({ unit: 'mm', format: 'a4' });
      var margin = 20;
      var pageWidth = doc.internal.pageSize.getWidth();
      var maxWidth = pageWidth - margin * 2;
      var y = 20;
      var lineHeight = 7;

      doc.setFontSize(16);
      doc.text('Chat med Jon – jwd.info', margin, y);
      y += 12;
      doc.setFontSize(10);
      doc.text('Eksportert: ' + new Date().toLocaleString('nb-NO'), margin, y);
      y += 15;

      doc.setFontSize(11);
      for (var i = 0; i < chatMessages.length; i++) {
        var msg = chatMessages[i];
        var label = msg.isUser ? 'Spørsmål:' : 'Svar:';
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        var lines = doc.splitTextToSize(msg.text, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + 6;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      }
      doc.save('chat-jon-' + new Date().toISOString().slice(0, 10) + '.pdf');
    }

    function setLoading(on) {
      sendBtn.disabled = on;
      sendBtn.textContent = on ? '...' : 'Send';
    }

    function send() {
      var msg = (input.value || '').trim();
      if (!msg) return;
      if (!API_URL || API_URL.indexOf('YOUR_VERCEL') !== -1) {
        addMessage('Chat-API er ikke konfigurert. Sett CHAT_API_URL i chat-config.js etter at du har deployet til Vercel.', false);
        return;
      }
      input.value = '';
      addMessage(msg, true);
      setLoading(true);
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          pageContent: getPageContent()
        })
      })
        .then(function(r) {
          if (!r.ok) {
            return r.json().then(function(err) {
              throw new Error(err.detail || err.error || 'Request failed');
            });
          }
          return r.json();
        })
        .then(function(data) {
          if (data.error) {
            addMessage('Feil: ' + (data.detail || data.error), false);
          } else {
            addMessage(data.reply || 'Ingen respons.', false);
          }
        })
        .catch(function(err) {
          addMessage('Kunne ikke få svar: ' + err.message, false);
        })
        .finally(function() { setLoading(false); });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') send();
    });

    var clearBtn = document.getElementById('chat-clear');
    var exportBtn = document.getElementById('chat-export-pdf');
    if (clearBtn) clearBtn.addEventListener('click', clearChat);
    if (exportBtn) exportBtn.addEventListener('click', exportPdf);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
