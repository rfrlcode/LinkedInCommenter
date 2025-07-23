console.log('LinkedIn AI Commenter: Content script loaded');

// Function to check if extension context is valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// Function to safely call chrome APIs
function safeStorageGet(callback) {
  if (!isExtensionContextValid()) {
    console.log('Extension context invalidated, skipping storage access');
    return;
  }
  
  try {
    chrome.storage.local.get('enabled', callback);
  } catch (error) {
    console.error('Storage access failed:', error);
  }
}

// Function to safely send messages
function safeSendMessage(message, callback) {
  if (!isExtensionContextValid()) {
    console.log('Extension context invalidated, cannot send message');
    if (callback) callback({ error: 'Extension context invalidated. Please reload the page.' });
    return;
  }
  
  try {
    chrome.runtime.sendMessage(message, callback);
  } catch (error) {
    console.error('Message sending failed:', error);
    if (callback) callback({ error: 'Extension connection failed. Please reload the page.' });
  }
}

safeStorageGet((data) => {
  if (!data || !isExtensionContextValid()) {
    console.log('Extension not enabled or context invalid');
    return;
  }
  
  console.log('Extension enabled:', data.enabled);
  if (data.enabled) {
    
    // Comment types configuration
    const commentTypes = {
      professional: {
        name: 'Professional',
        emoji: '💼',
        description: 'Thoughtful, professional response'
      },
      congratulatory: {
        name: 'Congratulatory',
        emoji: '🎉',
        description: 'Celebratory and supportive'
      },
      question: {
        name: 'Question',
        emoji: '❓',
        description: 'Ask a follow-up question'
      },
      insight: {
        name: 'Insight',
        emoji: '💡',
        description: 'Share relevant insight or experience'
      },
      supportive: {
        name: 'Supportive',
        emoji: '🤝',
        description: 'Encouraging and supportive'
      }
    };

    // Function to create inline comment type dropdown
    function createCommentTypeDropdown(commentBox, postContent, originalContent) {
      // Remove any existing dropdown
      const existingDropdown = document.querySelector('.ai-comment-dropdown');
      if (existingDropdown) {
        existingDropdown.remove();
      }

      // Find the comment form container - try multiple approaches
      let commentForm = commentBox.closest('.comments-comment-box');
      if (!commentForm) {
        commentForm = commentBox.closest('[class*="comment"]');
      }
      if (!commentForm) {
        commentForm = commentBox.parentElement;
      }
      
      if (!commentForm) {
        console.log('Could not find comment form to attach dropdown');
        return;
      }

      // Create dropdown container
      const dropdown = document.createElement('div');
      dropdown.className = 'ai-comment-dropdown';
      dropdown.innerHTML = `
        <button class="ai-dropdown-trigger">
          <span class="ai-trigger-icon">🤖</span>
          <span class="ai-trigger-text">AI Comment</span>
          <span class="ai-trigger-arrow">▼</span>
        </button>
        <div class="ai-dropdown-menu">
          ${Object.keys(commentTypes).map(type => `
            <button class="ai-dropdown-item" data-type="${type}">
              <span class="ai-item-emoji">${commentTypes[type].emoji}</span>
              <span class="ai-item-name">${commentTypes[type].name}</span>
            </button>
          `).join('')}
        </div>
      `;
      
      // Add styles if not already present
      if (!document.querySelector('#ai-dropdown-styles')) {
        const style = document.createElement('style');
        style.id = 'ai-dropdown-styles';
        style.textContent = `
          .ai-comment-dropdown {
            position: relative;
            display: inline-block;
            margin-left: 8px;
            vertical-align: top;
          }
          
          .ai-dropdown-trigger {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
            color: #666;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
          }
          
          .ai-dropdown-trigger:hover {
            background: #f8f9fa;
            border-color: #000;
            color: #333;
          }
          
          .ai-trigger-icon {
            font-size: 14px;
          }
          
          .ai-trigger-arrow {
            font-size: 10px;
            transition: transform 0.2s ease;
          }
          
          .ai-dropdown-trigger.active .ai-trigger-arrow {
            transform: rotate(180deg);
          }
          
          .ai-dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            min-width: 180px;
            display: none;
            overflow: hidden;
          }
          
          .ai-dropdown-menu.show {
            display: block;
            animation: aiDropdownSlide 0.2s ease;
          }
          
          .ai-dropdown-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            background: none;
            border: none;
            text-align: left;
            cursor: pointer;
            transition: background-color 0.2s ease;
            font-size: 14px;
          }
          
          .ai-dropdown-item:hover {
            background: #f8f9fa;
          }
          
          .ai-item-emoji {
            font-size: 16px;
            flex-shrink: 0;
          }
          
          .ai-item-name {
            font-weight: 500;
            color: #333;
          }
          
          @keyframes aiDropdownSlide {
            from {
              opacity: 0;
              transform: translateY(-5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Find a good position to insert the dropdown with debugging
      console.log('Comment form found:', commentForm);
      const toolbar = commentForm.querySelector('.ql-toolbar, .comments-comment-box-comment__form-footer');
      console.log('Toolbar found:', toolbar);
      
      if (toolbar) {
        toolbar.appendChild(dropdown);
        console.log('Dropdown added to toolbar');
      } else {
        // Try to find a better position or create one
        const formFooter = commentForm.querySelector('[class*="footer"], [class*="actions"], [class*="toolbar"]');
        if (formFooter) {
          formFooter.appendChild(dropdown);
          console.log('Dropdown added to form footer');
        } else {
          // Create a wrapper div if no good position is found
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'padding: 8px 0; border-top: 1px solid #e5e5e5; margin-top: 8px;';
          wrapper.appendChild(dropdown);
          commentForm.appendChild(wrapper);
          console.log('Dropdown added to new wrapper in comment form');
        }
      }
      
      // Add event listeners with better event handling
      const trigger = dropdown.querySelector('.ai-dropdown-trigger');
      const menu = dropdown.querySelector('.ai-dropdown-menu');
      
      trigger.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        trigger.classList.toggle('active');
        menu.classList.toggle('show');
        console.log('Dropdown toggled');
      };
      
      // Prevent any form submission when clicking on dropdown
      dropdown.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };
      
      // Close dropdown when clicking outside
      const closeDropdown = (e) => {
        if (!dropdown.contains(e.target)) {
          trigger.classList.remove('active');
          menu.classList.remove('show');
        }
      };
      document.addEventListener('click', closeDropdown);
      
      // Handle comment type selection
      dropdown.querySelectorAll('.ai-dropdown-item').forEach(item => {
        item.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const selectedType = item.dataset.type;
          console.log('Selected comment type:', selectedType);
          trigger.classList.remove('active');
          menu.classList.remove('show');
          generateCommentWithType(commentBox, postContent, selectedType, originalContent);
        };
      });
      
      return dropdown;
    }

    // Function to generate comment with specific type
    function generateCommentWithType(commentBox, postContent, commentType, originalContent, showDropdown = false) {
      console.log('Generating comment with type:', commentType);
      
      // Set loading state
      commentBox.innerHTML = `<p><i>🤖 Generating ${commentTypes[commentType].name.toLowerCase()} comment...</i></p>`;
      
      // Send message with comment type using safe function
      safeSendMessage({ 
        type: 'getComment', 
        postContent: postContent,
        commentType: commentType
      }, (response) => {
        if (response && response.error) {
          console.error('AI generation error:', response.error);
          commentBox.innerHTML = originalContent;
          alert(response.error);
          return;
        }
        
        if (response && response.comment) {
          console.log('Received AI comment:', response.comment);
          
          // Set the comment content as plain text to avoid auto-submit
          commentBox.innerHTML = '';
          commentBox.textContent = response.comment;
          
          // Create and show the dropdown after generating comment
          createCommentTypeDropdown(commentBox, postContent, originalContent);
          
          // Focus the comment box so user can edit if needed
          commentBox.focus();
          
          // Set cursor at the end of the text
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(commentBox);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          console.error('No comment received');
          commentBox.innerHTML = originalContent;
          alert('Failed to generate comment. Please try again.');
        }
      });
    }

    // Function to handle initial comment generation with default type
    function handleCommentGeneration(commentBox) {
      console.log('Handling comment generation for:', commentBox);
      
      // Find the post container
      const postSelectors = [
        '.feed-shared-update-v2',
        '.feed-shared-update-v2__wrapper', 
        '.update-components-article',
        '[data-urn]'
      ];
      
      let post = null;
      for (const selector of postSelectors) {
        post = commentBox.closest(selector);
        if (post) break;
      }
      
      if (!post) {
        console.log('Could not find post container');
        return;
      }
      
      // Find post content
      const contentSelectors = [
        '.update-components-text',
        '.feed-shared-text', 
        '.attributed-text-segment-list__content',
        '.feed-shared-update-v2__description-wrapper',
        '[data-test-id="main-feed-activity-card"] .break-words'
      ];
      
      let postContentElement = null;
      for (const selector of contentSelectors) {
        postContentElement = post.querySelector(selector);
        if (postContentElement) break;
      }
      
      const postContent = postContentElement ? postContentElement.innerText.trim() : 'No post content found';
      console.log('Post content:', postContent);
      
      const originalContent = commentBox.innerHTML;
      
      // Generate default professional comment first
      generateCommentWithType(commentBox, postContent, 'professional', originalContent, true);
    }
    
    // Listen for focus events on comment boxes (when they become active)
    document.addEventListener('focusin', (event) => {
      console.log('Focus event on:', event.target);
      
      // Check if it's a comment box
      const isCommentBox = event.target.matches('.ql-editor') || 
                          event.target.matches('[contenteditable="true"]') ||
                          (event.target.getAttribute && event.target.getAttribute('data-placeholder') && 
                           event.target.getAttribute('data-placeholder').toLowerCase().includes('comment'));
      
      if (isCommentBox) {
        console.log('Comment box focused:', event.target);
        
        // Add a small delay and check if the box is empty (indicating user wants to add a comment)
        setTimeout(() => {
          if (event.target.innerText.trim() === '' || 
              event.target.innerText.trim() === event.target.getAttribute('data-placeholder')) {
            handleCommentGeneration(event.target);
          }
        }, 200);
      }
    });
    
    // Also listen for clicks as backup
    document.addEventListener('click', (event) => {
      console.log('Click detected on:', event.target);
      
      // More comprehensive selectors for LinkedIn comment boxes
      const commentSelectors = [
        '.ql-editor',
        '[data-placeholder="Add a comment…"]',
        '.comments-comment-texteditor',
        '.comments-comment-box__form-container',
        '.comments-comment-box__ghost-text',
        '[contenteditable="true"]'
      ];
      
      const isCommentBox = commentSelectors.some(selector => 
        event.target.matches(selector) || event.target.closest(selector)
      );
      
      if (isCommentBox) {
        console.log('Comment box clicked');
        
        // Find the actual editable element
        let commentBox = event.target;
        if (!commentBox.matches('.ql-editor, [contenteditable="true"]')) {
          commentBox = event.target.querySelector('.ql-editor, [contenteditable="true"]') ||
                      event.target.closest('.ql-editor, [contenteditable="true"]');
        }
        
        if (!commentBox) {
          console.log('Could not find comment box');
          return;
        }
        
        // Find the post container with multiple possible selectors
        const postSelectors = [
          '.feed-shared-update-v2',
          '.feed-shared-update-v2__wrapper',
          '.update-components-article',
          '[data-urn]'
        ];
        
        let post = null;
        for (const selector of postSelectors) {
          post = event.target.closest(selector);
          if (post) break;
        }
        
        if (!post) {
          console.log('Could not find post container');
          return;
        }
        
        console.log('Post found:', post);
        
        // Find post content with multiple possible selectors
        const contentSelectors = [
          '.update-components-text',
          '.feed-shared-text',
          '.attributed-text-segment-list__content',
          '.feed-shared-update-v2__description-wrapper',
          '[data-test-id="main-feed-activity-card"] .break-words'
        ];
        
        let postContentElement = null;
        for (const selector of contentSelectors) {
          postContentElement = post.querySelector(selector);
          if (postContentElement) break;
        }
        
        const postContent = postContentElement ? postContentElement.innerText.trim() : 'No post content found';
        console.log('Post content:', postContent);
        
        // Set loading state
        const originalContent = commentBox.innerHTML;
        commentBox.innerHTML = `<p><i>🤖 Generating comment...</i></p>`;
        
        // Send message to background script using safe function
        safeSendMessage({ 
          type: 'getComment', 
          postContent: postContent 
        }, (response) => {
          if (response && response.error) {
            console.error('AI generation error:', response.error);
            commentBox.innerHTML = originalContent;
            alert(response.error);
            return;
          }
          
          if (response && response.comment) {
            console.log('Received comment:', response.comment);
            commentBox.innerHTML = `<p>${response.comment}</p>`;
            
            // Focus and set cursor at the end
            commentBox.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(commentBox);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            console.error('No comment received in response');
            commentBox.innerHTML = originalContent;
            alert('Failed to generate comment. Please try again.');
          }
        });
      }
    });
  }
});
