        let currentQuestion = null;
        let reportTarget = null;

        function getQuestionId() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('id');
        }

        function shouldTrackView(questionId) {
            if (!questionId) return false;

            const key = `qa-viewed-${questionId}`;
            const now = Date.now();
            const cooldownMs = 30 * 60 * 1000;

            const lastViewedAt = Number(localStorage.getItem(key) || 0);
            if (Number.isFinite(lastViewedAt) && lastViewedAt > 0 && (now - lastViewedAt) < cooldownMs) {
                return false;
            }

            localStorage.setItem(key, String(now));
            return true;
        }

        async function loadQuestionDetail(trackView = false) {
            const questionId = getQuestionId();
            if (!questionId) {
                PageUtils.showAlert('無效的提問ID', 'error');
                return;
            }

            try {
                const shouldCount = trackView && shouldTrackView(questionId);
                const response = await APIClient.get(`qa.php?action=detail&id=${questionId}&track_view=${shouldCount ? 1 : 0}`);
                if (response.success) {
                    currentQuestion = response.data;
                    displayQuestionDetail(currentQuestion);
                    loadReplies(questionId);
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('載入提問詳情失敗', 'error');
            } finally {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('qa-detail').style.display = 'block';
            }
        }

        function displayQuestionDetail(question) {
            const title = question.title || question.question_title || '';
            const author = question.author_name || question.user_name || question.display_name || '匿名用戶';
            const content = question.content || question.question_content || '';
            const solved = Boolean(question.is_solved) || question.status === 'closed';
            const urgencyLabel = question.urgency_label || '一般';
            const urgencyStyle = question.urgency_level === 'urgent'
                ? 'background: #c92a2a; color: white;'
                : (question.urgency_level === 'important'
                    ? 'background: #f08c00; color: white;'
                    : 'background: #868e96; color: white;');

            document.getElementById('question-title').textContent = title;
            const authorEl = document.getElementById('question-author');
            authorEl.textContent = author;
            if (question.user_id) {
                const idTag = document.createElement('a');
                idTag.href = `messages.html?user_id=${Number(question.user_id)}&name=${encodeURIComponent(author)}`;
                idTag.style.cssText = 'margin-left:6px;font-size:0.75rem;color:var(--text-muted,#6b7280);font-family:monospace;text-decoration:none;';
                idTag.title = '傳送私訊';
                idTag.textContent = `#${Number(question.user_id)}`;
                authorEl.appendChild(idTag);
            }
            document.getElementById('question-date').textContent = PageUtils.formatDate(question.created_at);
            document.getElementById('question-category').textContent = urgencyLabel;
            document.getElementById('question-category').style.cssText = urgencyStyle;
            document.getElementById('question-content').textContent = content;
            document.getElementById('replies-count').textContent = question.replies_count;
            document.getElementById('views-count').textContent = question.views_count;
            document.getElementById('helpful-count').textContent = question.helpful_count;
            document.getElementById('not-helpful-count').textContent = question.not_helpful_count || 0;

            const statusElement = document.getElementById('question-status');
            if (solved) {
                statusElement.textContent = '已解決';
                statusElement.className = 'badge badge-success';
            } else {
                statusElement.textContent = '待解決';
                statusElement.className = 'badge badge-warning';
            }

            const user = StorageUtils.getUser();
            if ((question.can_mark_solved || (user && user.user_id === question.user_id)) && !solved) {
                document.getElementById('question-actions').style.display = 'block';
            }

            const reportQuestionBtn = document.getElementById('report-question-btn');
            if (reportQuestionBtn) {
                reportQuestionBtn.style.display = question.can_report ? 'inline-block' : 'none';
            }

            updateOfficialReplyVisibility();
        }

        function updateOfficialReplyVisibility() {
            const user = StorageUtils.getUser();
            const officialCheckbox = document.getElementById('is-official-reply');
            if (!officialCheckbox) return;

            const officialField = officialCheckbox.parentElement;
            if (!officialField) return;

            const canOfficialReply = Boolean(user && currentQuestion && currentQuestion.can_official_reply);
            officialField.style.display = canOfficialReply ? 'block' : 'none';
            if (!canOfficialReply) {
                officialCheckbox.checked = false;
            }
        }

        async function loadReplies(questionId) {
            try {
                const response = await APIClient.get(`qa.php?action=replies&question_id=${questionId}`);
                if (response.success) {
                    const replies = Array.isArray(response.data.replies) ? response.data.replies : [];
                    const container = document.getElementById('replies-list');

                    if (replies.length === 0) {
                        container.innerHTML = '<p>尚無回覆</p>';
                        return;
                    }

                    const childMap = new Map();
                    const replyMap = new Map();
                    replies.forEach(reply => {
                        const parentId = Number(reply.parent_reply_id);
                        const hasParent = Number.isInteger(parentId) && parentId > 0;
                        const parentKey = hasParent ? String(parentId) : 'root';
                        replyMap.set(String(reply.reply_id), reply);
                        if (!childMap.has(parentKey)) {
                            childMap.set(parentKey, []);
                        }
                        childMap.get(parentKey).push(reply);
                    });

                    const createInlineReplyForm = (parentReplyId) => {
                        const form = document.createElement('form');
                        form.className = 'reply-inline-form dcard-inline-form';
                        form.dataset.parentReplyId = String(parentReplyId);
                        form.innerHTML = `
                            <div class="form-group" style="margin-bottom: 0.6rem;">
                                <label>回覆內容</label>
                                <textarea rows="3" placeholder="回覆這則留言..." required></textarea>
                            </div>
                            <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                                <button type="submit" class="btn btn-primary btn-sm">送出回覆</button>
                                <button type="button" class="btn btn-secondary btn-sm reply-inline-cancel">取消</button>
                            </div>
                        `;
                        form.addEventListener('submit', handleReplySubmit);
                        form.querySelector('.reply-inline-cancel').addEventListener('click', () => form.remove());
                        return form;
                    };

                    const renderReplyNode = (reply, depth = 0, floorLabel = '') => {
                        const user = StorageUtils.getUser();
                        const node = document.createElement('div');
                        node.className = depth === 0 ? 'dcard-reply-root' : 'dcard-reply-child';

                        const shell = document.createElement('div');
                        shell.className = depth === 0 ? 'dcard-reply-shell' : 'dcard-reply-child-shell';
                        if (Number(reply.reply_id) > 0) {
                            shell.id = `reply-${Number(reply.reply_id)}`;
                        }

                        const top = document.createElement('div');
                        top.className = 'dcard-reply-top';

                        const identity = document.createElement('div');
                        identity.className = 'dcard-reply-identity';

                        const floor = document.createElement('span');
                        floor.className = 'dcard-floor-badge';
                        floor.textContent = `${floorLabel}樓`;
                        identity.appendChild(floor);

                        const author = document.createElement('strong');
                        author.textContent = reply.author_name || reply.user_name || '匿名用戶';
                        identity.appendChild(author);

                        if (reply.user_id) {
                            const replyIdTag = document.createElement('a');
                            const replyAuthorName = reply.author_name || reply.user_name || '';
                            replyIdTag.href = `messages.html?user_id=${Number(reply.user_id)}&name=${encodeURIComponent(replyAuthorName)}`;
                            replyIdTag.style.cssText = 'margin-left:5px;font-size:0.73rem;color:var(--text-muted,#6b7280);font-family:monospace;text-decoration:none;font-weight:400;';
                            replyIdTag.title = '傳送私訊';
                            replyIdTag.textContent = `#${Number(reply.user_id)}`;
                            identity.appendChild(replyIdTag);
                        }

                        if (reply.is_official) {
                            const official = document.createElement('span');
                            official.className = 'badge badge-primary';
                            official.textContent = '官方回覆';
                            identity.appendChild(official);
                        }

                        const time = document.createElement('span');
                        time.className = 'dcard-reply-time';
                        time.textContent = PageUtils.timeAgo(reply.created_at);

                        const stats = document.createElement('div');
                        stats.className = 'dcard-reply-stats';
                        stats.textContent = `👍 ${reply.helpful_count} ・ 👎 ${reply.not_helpful_count}`;

                        top.appendChild(identity);
                        top.appendChild(time);
                        top.appendChild(stats);

                        const content = document.createElement('div');
                        content.className = 'dcard-reply-content';
                        content.textContent = reply.content || '';

                        const currentParentId = Number(reply.parent_reply_id);
                        if (Number.isInteger(currentParentId) && currentParentId > 0) {
                            const parentReply = replyMap.get(String(currentParentId));
                            const parentTag = document.createElement('div');
                            parentTag.className = 'dcard-reply-parent-tag';
                            parentTag.textContent = parentReply
                                ? `回覆 ${parentReply.author_name || parentReply.user_name || '匿名用戶'}`
                                : '回覆上一則留言';
                            content.prepend(parentTag);
                        }

                        const actions = document.createElement('div');
                        actions.className = 'dcard-reply-actions';

                        if (reply.can_vote) {
                            const helpfulBtn = document.createElement('button');
                            helpfulBtn.type = 'button';
                            helpfulBtn.className = `dcard-action-btn ${reply.my_vote === 'helpful' ? 'is-active' : ''}`;
                            helpfulBtn.textContent = '有幫助';
                            helpfulBtn.addEventListener('click', () => markReplyVote(reply.reply_id, 'helpful'));

                            const notHelpfulBtn = document.createElement('button');
                            notHelpfulBtn.type = 'button';
                            notHelpfulBtn.className = `dcard-action-btn ${reply.my_vote === 'not_helpful' ? 'is-active-danger' : ''}`;
                            notHelpfulBtn.textContent = '沒有幫助';
                            notHelpfulBtn.addEventListener('click', () => markReplyVote(reply.reply_id, 'not_helpful'));

                            actions.appendChild(helpfulBtn);
                            actions.appendChild(notHelpfulBtn);
                        }

                        if (user) {
                            const replyBtn = document.createElement('button');
                            replyBtn.type = 'button';
                            replyBtn.className = 'dcard-action-btn';
                            replyBtn.textContent = '回覆';
                            replyBtn.addEventListener('click', () => {
                                const existing = node.querySelector('.reply-inline-form');
                                if (existing) {
                                    existing.remove();
                                    return;
                                }
                                node.appendChild(createInlineReplyForm(reply.reply_id));
                                const textarea = node.querySelector('.reply-inline-form textarea');
                                if (textarea) textarea.focus();
                            });
                            actions.appendChild(replyBtn);
                        }

                        if (reply.can_report) {
                            const reportBtn = document.createElement('button');
                            reportBtn.type = 'button';
                            reportBtn.className = 'dcard-action-btn';
                            reportBtn.textContent = '檢舉';
                            reportBtn.addEventListener('click', () => reportContent('qa_reply', reply.reply_id));
                            actions.appendChild(reportBtn);
                        }

                        shell.appendChild(top);
                        shell.appendChild(content);
                        shell.appendChild(actions);
                        node.appendChild(shell);

                        return node;
                    };

                    const collectThreadReplies = (rootReplyId) => {
                        const collected = [];
                        const visited = new Set();
                        const queue = [...(childMap.get(String(rootReplyId)) || [])];

                        while (queue.length > 0) {
                            const current = queue.shift();
                            if (!current) continue;
                            const currentKey = String(current.reply_id);
                            if (visited.has(currentKey)) continue;
                            visited.add(currentKey);
                            collected.push(current);
                            const children = childMap.get(String(current.reply_id)) || [];
                            children.forEach(child => queue.push(child));
                        }

                        collected.sort((a, b) => {
                            const t1 = new Date(a.created_at || 0).getTime();
                            const t2 = new Date(b.created_at || 0).getTime();
                            if (t1 !== t2) return t1 - t2;
                            return Number(a.reply_id) - Number(b.reply_id);
                        });

                        return collected;
                    };

                    const roots = childMap.get('root') || [];
                    const fragment = document.createDocumentFragment();
                    roots.forEach((reply, index) => {
                        const rootFloor = String(index + 1);
                        const replyBlock = document.createElement('div');
                        replyBlock.style.display = 'flex';
                        replyBlock.style.flexDirection = 'column';
                        replyBlock.style.gap = '0.8rem';
                        replyBlock.style.marginBottom = '1rem';

                        replyBlock.appendChild(renderReplyNode(reply, 0, rootFloor));

                        const threadReplies = collectThreadReplies(reply.reply_id);
                        if (threadReplies.length > 0) {
                            const childrenWrap = document.createElement('div');
                            childrenWrap.className = 'dcard-children-wrap';

                            const label = document.createElement('div');
                            label.className = 'dcard-children-label';
                            label.textContent = `查看其他 ${threadReplies.length} 則留言`;
                            childrenWrap.appendChild(label);

                            threadReplies.forEach((childReply, childIndex) => {
                                const childFloor = `${rootFloor}-${childIndex + 1}`;
                                childrenWrap.appendChild(renderReplyNode(childReply, 1, childFloor));
                            });

                            replyBlock.appendChild(childrenWrap);
                        }

                        fragment.appendChild(replyBlock);
                    });
                    container.innerHTML = '';
                    container.appendChild(fragment);

                    const hash = window.location.hash || '';
                    if (hash.startsWith('#reply-')) {
                        const target = document.getElementById(hash.slice(1));
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            const oldBg = target.style.backgroundColor;
                            target.style.transition = 'background-color 0.8s ease';
                            target.style.backgroundColor = 'rgba(255, 245, 157, 0.45)';
                            setTimeout(() => {
                                target.style.backgroundColor = oldBg || '';
                            }, 1400);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading replies:', error);
                document.getElementById('replies-list').innerHTML = '<p>載入失敗</p>';
            }
        }

        async function markAsSolved() {
            const questionId = getQuestionId();
            try {
                const response = await APIClient.post('qa.php?action=mark_solved', { question_id: questionId });
                if (response.success) {
                    PageUtils.showAlert('已標記為已解決', 'success');
                    loadQuestionDetail(false);
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('操作失敗', 'error');
            }
        }

        async function markReplyVote(replyId, voteType) {
            try {
                const action = voteType === 'not_helpful' ? 'mark_not_helpful' : 'mark_helpful';
                const response = await APIClient.post(`qa.php?action=${action}`, { reply_id: replyId });
                if (response.success) {
                    PageUtils.showAlert('感謝您的回饋', 'success');
                    loadReplies(getQuestionId());
                    loadQuestionDetail(false);
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('操作失敗', 'error');
            }
        }

        async function markHelpful(replyId) {
            return markReplyVote(replyId, 'helpful');
        }

        async function reportContent(contentType, contentId) {
            if (!StorageUtils.isLoggedIn()) {
                PageUtils.showAlert('請先登入', 'warning');
                return;
            }

            if (contentType === 'qa_question' && currentQuestion && !currentQuestion.can_report) {
                PageUtils.showAlert('不能檢舉自己發佈的提問', 'warning');
                return;
            }

            reportTarget = {
                contentType: contentType,
                contentId: Number(contentId)
            };

            document.getElementById('report-type-select').value = '';
            document.getElementById('report-reason-input').value = '';
            document.getElementById('report-modal').style.display = 'flex';
        }

        function closeReportModal() {
            reportTarget = null;
            document.getElementById('report-modal').style.display = 'none';
        }

        async function submitReportForm(event) {
            event.preventDefault();
            if (!reportTarget) return;

            const reportType = document.getElementById('report-type-select').value;
            const reason = document.getElementById('report-reason-input').value.trim();
            if (!reportType) {
                PageUtils.showAlert('請選擇檢舉事由', 'warning');
                return;
            }

            try {
                const response = await APIClient.post('reports.php?action=create', {
                    reported_content_type: reportTarget.contentType,
                    reported_content_id: reportTarget.contentId,
                    report_type: reportType,
                    reason: reason
                });

                if (response.success) {
                    PageUtils.showAlert('檢舉已送出', 'success');
                    closeReportModal();
                } else {
                    PageUtils.showAlert(response.message || '檢舉失敗', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('檢舉失敗', 'error');
            }
        }

        async function handleReplySubmit(e) {
            e.preventDefault();

            const form = e.currentTarget;
            const isInlineForm = form.classList.contains('reply-inline-form');
            const contentInput = isInlineForm ? form.querySelector('textarea') : document.getElementById('reply-content');
            const parentReplyIdInput = document.getElementById('reply-parent-id');
            const content = contentInput ? contentInput.value.trim() : '';

            if (!content) {
                PageUtils.showAlert('請輸入回覆內容', 'error');
                return;
            }

            const questionId = getQuestionId();
            const isOfficial = isInlineForm ? false : document.getElementById('is-official-reply').checked;
            const parentReplyId = isInlineForm ? (form.dataset.parentReplyId || '') : (parentReplyIdInput ? parentReplyIdInput.value : '');

            try {
                const response = await APIClient.post('qa.php?action=add_reply', {
                    question_id: questionId,
                    content: content,
                    is_official: isOfficial,
                    parent_reply_id: parentReplyId
                });

                if (response.success) {
                    PageUtils.showAlert('回覆提交成功', 'success');
                    if (isInlineForm) {
                        form.remove();
                    } else {
                        document.getElementById('add-reply-form').reset();
                        if (parentReplyIdInput) parentReplyIdInput.value = '';
                    }
                    loadReplies(questionId);
                    loadQuestionDetail(false);
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('提交回覆失敗', 'error');
            }
        }

        window.addEventListener('DOMContentLoaded', async function() {
            loadQuestionDetail(true);

            if (typeof hydrateUserFromSession === 'function') {
                await hydrateUserFromSession();
            }

            document.getElementById('mark-solved-btn').addEventListener('click', markAsSolved);
            document.getElementById('add-reply-form').addEventListener('submit', handleReplySubmit);
            document.getElementById('report-form').addEventListener('submit', submitReportForm);
            document.getElementById('report-cancel-btn').addEventListener('click', closeReportModal);
            document.getElementById('report-question-btn').addEventListener('click', () => {
                const questionId = getQuestionId();
                if (!questionId) return;
                reportContent('qa_question', Number(questionId));
            });

            const user = StorageUtils.getUser();
            if (user) {
                document.getElementById('reply-form-section').style.display = 'none';
                document.getElementById('reply-form').style.display = 'block';
                document.getElementById('add-reply-form').dataset.parentReplyId = '';
                updateOfficialReplyVisibility();
            } else {
                updateOfficialReplyVisibility();
            }
        });
