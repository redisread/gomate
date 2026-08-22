-- The original v3 seed pointed at a retired Worker static path. Keep user-edited covers intact.
UPDATE `locations`
SET `cover_image_url` = 'https://gomate.cos.jiahongw.com/locations/hiking/wutong-mountain/wutongshan_01.jpg'
WHERE `id` = 'location-shenzhen-wutongshan'
  AND `cover_image_url` = 'https://gomate.live/images/locations/wutongshan-cover.jpg';
