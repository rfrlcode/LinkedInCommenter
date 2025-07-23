console.log('LinkedIn AI Commenter: Content script loaded');

chrome.storage.local.get('enabled', (data) => {
  console.log('Extension enabled:', data.enabled);
  if (data.enabled) {
    
    // Function to handle comment generation
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
      
      // Set loading state
      const originalContent = commentBox.innerHTML;
      commentBox.innerHTML = `<p><i>🤖 Generating comment...</i></p>`;
      
      // Send message 
      chrome.runtime.sendMessage({ 
        type: 'getComment', 
        postContent: postContent 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          commentBox.innerHTML = originalContent;
          alert('Extension connection failed. Please try reloading the page.');
          return;
        }
        
        if (response && response.error) {
          console.error('AI generation error:', response.error);
          commentBox.innerHTML = originalContent;
          alert(response.error);
          return;
        }
        
        if (response && response.comment) {
          console.log('Received AI comment:', response.comment);
          commentBox.innerHTML = `<p>${response.comment}</p>`;
          commentBox.focus();
        } else {
          console.error('No comment received');
          commentBox.innerHTML = originalContent;
          alert('Failed to generate comment. Please try again.');
        }
      });
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
        
        // Send message to background script with retry logic
        const sendMessageWithRetry = (retryCount = 0) => {
          chrome.runtime.sendMessage({ 
            type: 'getComment', 
            postContent: postContent 
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Runtime error:', chrome.runtime.lastError);
              
              // Retry up to 2 times if connection failed
              if (retryCount < 2 && chrome.runtime.lastError.message.includes('connection')) {
                console.log('Retrying message send...');
                setTimeout(() => sendMessageWithRetry(retryCount + 1), 500);
                return;
              }
              
              // If all retries failed, restore original content
              commentBox.innerHTML = originalContent;
              alert('Extension connection failed. Please try reloading the page.');
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
            }
          });
        };
        
        sendMessageWithRetry();
      }
    });
  }
});
