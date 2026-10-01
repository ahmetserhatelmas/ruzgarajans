const { withInfoPlist } = require('expo/config-plugins');

/**
 * Keep landscape available so the record screen can turn.
 * The app starts portrait; only the camera screen unlocks rotation.
 */
function withIphonePortrait(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UISupportedInterfaceOrientations = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ];
    mod.modResults['UISupportedInterfaceOrientations~ipad'] = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ];
    return mod;
  });
}

module.exports = withIphonePortrait;
