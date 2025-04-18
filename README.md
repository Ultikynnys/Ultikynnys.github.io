# Portfolio Website

A static portfolio website showcasing programming and 3D projects. Projects are defined in Markdown files and automatically rendered in the HTML pages.

## Project Structure

```
.
├── programming-portfolio.html    # Programming portfolio page
├── 3d-portfolio.html            # 3D portfolio page
├── programming-projects.md      # Programming projects data
├── 3d-projects.md              # 3D projects data
├── styles.css                  # Shared styles
└── README.md                   # This file
```

## Adding New Projects

### Programming Projects

Add new projects to `programming-projects.md` using this format:

```markdown
## Project Name
- Title: Project Title
- Description: Project description...
- Media: [YouTube URL or image path or multi-image array]
- GitHub: [GitHub repository URL]
- Private: [true/false]
- Store: [optional] [App Store/Play Store URL]
```

Parameters:
- `Title`: The name of your project
- `Description`: A brief description of the project
- `Media`: 
  - YouTube video: Use the embed URL (e.g., `https://www.youtube.com/embed/VIDEO_ID`)
  - Single image: Use the path to your image file
  - Multiple images: Use an array format: `[image1.jpg, image2.jpg, image3.jpg]`
- `GitHub`: Link to the project's GitHub repository
- `Private`: Set to `true` if the repository is private, `false` if public
- `Store`: Optional link to app stores (for mobile/web apps)

Example:
```markdown
## Weather App
- Title: Weather Forecast App
- Description: A cross-platform weather application with real-time updates...
- Media: [screenshots/home.jpg, screenshots/forecast.jpg, screenshots/settings.jpg]
- GitHub: https://github.com/yourusername/weather-app
- Private: false
- Store: https://play.google.com/store/apps/details?id=com.yourapp.weather
```

### 3D Projects

Add new projects to `3d-projects.md` using this format:

```markdown
## Project Name
- Title: Project Title
- Description: Project description...
- Media: [image path or multi-image array]
- ArtStation: [ArtStation project URL]
- Store: [optional] [marketplace URL]
```

Parameters:
- `Title`: The name of your 3D project
- `Description`: A description of the project and techniques used
- `Media`: 
  - Single image: Path to your project image or render
  - Multiple images: Array format: `[view1.jpg, view2.jpg, view3.jpg]`
- `ArtStation`: Link to your ArtStation project page
- `Store`: Optional link to 3D asset marketplaces (e.g., Unity Asset Store, Sketchfab)

Example:
```markdown
## Sci-Fi Environment
- Title: Futuristic Cityscape
- Description: A detailed sci-fi environment created in Blender...
- Media: [renders/front.jpg, renders/side.jpg, renders/top.jpg, renders/detail.jpg]
- ArtStation: https://www.artstation.com/artwork/cityscape
- Store: https://assetstore.unity.com/packages/3d/environments/sci-fi-city-123456
```

### Game Projects

Add new game projects to `games.md` using this format:

```markdown
## Game Name
- Title: Game Title
- Description: Game description...
- Media: [image path or multi-image array]
- Demo: [optional] [Game demo/itch.io URL]
- Store: [optional] [Steam/Store URL]
- Private: [true/false]
- Engine: [Game engine used: Unity, Unreal Engine, Godot, Source Engine]
```

Parameters:
- `Title`: The name of your game
- `Description`: A description of the game and your contributions
- `Media`: 
  - Single image: Path to your game screenshot or promotional image
  - Multiple images: Array format: `[screenshot1.jpg, screenshot2.jpg, screenshot3.jpg]`
- `Demo`: Optional link to a playable demo or itch.io page
- `Store`: Optional link to Steam or other store page
- `Private`: Set to `true` if the project is private, `false` if public
- `Engine`: The game engine used (Unity, Unreal Engine, Godot, Source Engine)

Example:
```markdown
## Dungeon Crawler
- Title: Dungeon Crawler
- Description: A roguelike dungeon crawler with procedural level generation...
- Media: [games/dungeon1.jpg, games/dungeon2.jpg]
- Demo: https://itch.io/game/dungeon-crawler
- Store: https://store.steampowered.com/app/123456/Dungeon_Crawler/
- Private: false
- Engine: Unity
```

## Media Types

### Programming Projects
1. **YouTube Videos**
   - Use the embed URL format: `https://www.youtube.com/embed/VIDEO_ID`
   - The video will be displayed in a responsive iframe

2. **Single Images**
   - Use relative paths to your image files
   - Supported formats: JPG, PNG, GIF
   - Recommended size: 16:9 aspect ratio

3. **Multiple Images**
   - Use array format: `[image1.jpg, image2.jpg, ...]`
   - Images will be displayed in a carousel
   - Navigation arrows appear on hover
   - Auto-advances every 5 seconds
   - Click to pause auto-advance

### 3D Projects
1. **Single Images**
   - Use relative paths to your render/image files
   - Supported formats: JPG, PNG
   - Recommended size: 16:9 aspect ratio for consistency

2. **Multiple Images**
   - Use array format: `[view1.jpg, view2.jpg, ...]`
   - Same carousel functionality as programming projects
   - Great for showing different angles or details of 3D work

### Game Projects
1. **Single Images**
   - Use relative paths to your game screenshot or promotional image files
   - Supported formats: JPG, PNG
   - Recommended size: 16:9 aspect ratio for consistency

2. **Multiple Images**
   - Use array format: `[screenshot1.jpg, screenshot2.jpg, ...]`
   - Same carousel functionality as programming projects
   - Great for showing different angles or details of the game

## Project Tags and Features

### Programming Projects
- **Private Tag**: Automatically shown for projects with `Private: true`
- **Store Links**: Displayed when `Store` parameter is provided
- **GitHub Links**: Always shown when `GitHub` URL is provided
- **Demo Links**: Displayed when `Demo` parameter is provided
- **Image Carousel**: Automatically enabled for projects with multiple images

### 3D Projects
- **Private Tag**: Automatically shown for projects with `Private: true` 
- **Store Links**: Displayed when `Store` parameter is provided, with special Steam Workshop/Store icons
- **Demo Links**: Displayed when `Demo` parameter is provided
- **Sketchfab Support**: Automatically embeds 3D models when Sketchfab URLs are provided
- **Image Carousel**: Automatically enabled for projects with multiple images

### Game Projects
- **Game Engine Tag**: Shows the engine used with an appropriate icon:
  - Unity: Unity logo
  - Unreal Engine: UE logo
  - Godot: Ghost icon
  - Source Engine: Steam icon
  - Default: Gamepad icon
- **Demo Links**: Displayed when `Demo` parameter is provided
- **Store Links**: Displayed when `Store` parameter is provided, with Steam icon for Steam store links
- **Private Tag**: Automatically shown for projects with `Private: true`
- **Image Carousel**: Automatically enabled for projects with multiple images

1. **Media Organization**
   - Keep all media files in a dedicated `images` or `media` folder
   - Use descriptive filenames
   - Optimize images for web (recommended max size: 1920x1080)
   - For multiple images, use consistent naming (e.g., `project_view1.jpg`, `project_view2.jpg`)

2. **Descriptions**
   - Keep descriptions concise but informative
   - Highlight key features and technologies used
   - Include any notable achievements or challenges

3. **Links**
   - Always use full URLs (including `https://`)
   - Test all links before adding them
   - For private repositories, ensure the `Private` flag is set to `true`

4. **Multiple Images**
   - Use 3-5 images for best presentation
   - Ensure consistent image sizes and aspect ratios
   - Order images logically (e.g., overview → details → features)
   - Use descriptive filenames that indicate the view or feature shown

## Troubleshooting

If projects aren't displaying correctly:
1. Check the Markdown syntax in your project files
2. Verify all required parameters are present
3. Ensure media files exist at the specified paths
4. For multiple images, verify the array format is correct
5. Check the browser console for any JavaScript errors