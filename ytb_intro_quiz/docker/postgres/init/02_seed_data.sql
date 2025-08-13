-- Insert sample users
INSERT INTO users (username, email, password_hash) VALUES
('demo_user', 'demo@example.com', '$2b$10$YourHashedPasswordHere'),
('test_user', 'test@example.com', '$2b$10$YourHashedPasswordHere');

-- Insert sample videos
INSERT INTO videos (youtube_id, title, channel_name, thumbnail_url, duration) VALUES
('dQw4w9WgXcQ', 'Sample Video 1', 'Sample Channel', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 212),
('jNQXAC9IVRw', 'Sample Video 2', 'Sample Channel 2', 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg', 19);