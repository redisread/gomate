
INSERT INTO users (id,name,email) VALUES ('migration-leader','隊長','leader@example.test'),('migration-member','Member','member@example.test'),('migration-left','Left','left@example.test');
INSERT INTO teams (id,location_id,leader_id,activity_type,title,start_at,end_at,max_participants,checklist)
SELECT 'migration-team',id,'migration-leader','hiking','日本語を保持',100,200,4,'{"meetingPoint":{"name":"駅","time":"08:00","note":"北口"}}' FROM locations LIMIT 1;
INSERT INTO team_members (team_id,user_id,joined_at,left_at) VALUES ('migration-team','migration-member',50,NULL),('migration-team','migration-left',40,60);
INSERT INTO tags(id,name,slug) VALUES ('migration-tag','Migration','migration-tag');
INSERT INTO team_tags(team_id,tag_id) VALUES ('migration-team','migration-tag');
INSERT INTO stories(id,author_id,title,content,team_id) VALUES ('old-story','migration-leader','old','old','migration-team');
INSERT INTO story_likes(user_id,story_id) VALUES ('migration-member','old-story');
INSERT INTO story_tags(story_id,tag_id) VALUES ('old-story','migration-tag');
INSERT INTO user_story_favorites(user_id,story_id) VALUES ('migration-member','old-story');
INSERT INTO conversations(id,team_id,member_user_id,initiated_by_user_id) VALUES ('old-chat','migration-team','migration-member','migration-leader');
INSERT INTO messages(id,conversation_id,sender_id,content) VALUES ('old-message','old-chat','migration-member','old');
INSERT INTO team_join_requests(id,team_id,user_id) VALUES ('old-request','migration-team','migration-left');
